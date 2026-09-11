import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { InvariantError } from "@/domain/errors";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { PrismaClient } from "@/generated/prisma/client";
import { buildCreatedChanges } from "@/application/audit/changes";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { runAuditedMutation } from "@/infrastructure/db/audited-transaction";
import { evaluateRealtimeCursor } from "@/infrastructure/realtime/cursor";
import { RealtimeHub } from "@/infrastructure/realtime/hub";
import { getListenConnectionString } from "@/infrastructure/realtime/notify";
import { createPrismaRealtimeEventStore } from "@/infrastructure/realtime/prisma-store";
import type { PersistedRealtimeEvent } from "@/infrastructure/realtime/types";

function bufferHubEvents(hub: RealtimeHub): {
  waitFor(
    predicate: (event: PersistedRealtimeEvent) => boolean,
    timeoutMs?: number,
  ): Promise<PersistedRealtimeEvent>;
  stop(): void;
} {
  const events: PersistedRealtimeEvent[] = [];
  const unsubscribe = hub.subscribe((event) => {
    events.push(event);
  });

  return {
    stop: unsubscribe,
    waitFor(predicate, timeoutMs = 5000) {
      return new Promise((resolve, reject) => {
        const started = Date.now();
        const tick = () => {
          const found = events.find(predicate);
          if (found) {
            resolve(found);
            return;
          }
          if (Date.now() - started > timeoutMs) {
            reject(new Error("timeout waiting for LISTEN notification"));
            return;
          }
          setTimeout(tick, 25);
        };
        tick();
      });
    },
  };
}

describe("realtime persistence and LISTEN (postgres)", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("does not NOTIFY when the audited mutation rolls back", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t21.rollback/${suffix}`,
        oidcSubject: `sub-${suffix}`,
        displayName: "T21 rollback",
      },
    });
    const area = await prisma.area.create({
      data: {
        name: `T21 Área rollback ${suffix}`,
        nameNormalized: normalizeCatalogName(`T21 Área rollback ${suffix}`),
      },
    });
    const notified: bigint[] = [];

    try {
      await expect(
        runAuditedMutation({
          prisma,
          actor: { id: user.id },
          notifyRealtime: async (ids) => {
            notified.push(...ids);
          },
          load: async () => null,
          mutate: async (tx) => {
            const created = await tx.project.create({
              data: {
                name: `T21 rolled back ${suffix}`,
                nameNormalized: normalizeCatalogName(`T21 rolled back ${suffix}`),
                responsibleAreaId: area.id,
                architectureOwnerId: user.id,
                nature: "OPERATIONAL",
                architectureRole: "CONTRIBUTOR",
                status: "PLANNED",
                createdById: user.id,
                updatedById: user.id,
              },
            });
            throw new InvariantError("forced rollback after mutate");
            return created;
          },
          audit: ({ result }) => ({
            entityKind: AuditEntityKind.Project,
            entityId: result.id,
            action: AuditAction.created,
            projectId: result.id,
            changes: buildCreatedChanges({ name: result.name }),
          }),
        }),
      ).rejects.toBeInstanceOf(InvariantError);

      expect(notified).toEqual([]);
      const projects = await prisma.project.findMany({
        where: { nameNormalized: normalizeCatalogName(`T21 rolled back ${suffix}`) },
      });
      expect(projects).toHaveLength(0);
    } finally {
      await prisma.area.delete({ where: { id: area.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("replays by id and treats a cursor older than seven days as expired", async ({
    skip,
  }) => {
    if (!prisma) {
      skip();
      return;
    }
    const store = createPrismaRealtimeEventStore(prisma);
    const marker = randomUUID();
    const createdIds: bigint[] = [];
    const first = await prisma.realtimeEvent.create({
      data: {
        type: "project.changed",
        payload: { entityKind: "project", entityId: marker, seq: 1 },
      },
    });
    createdIds.push(first.id);
    const second = await prisma.realtimeEvent.create({
      data: {
        type: "project.changed",
        payload: { entityKind: "project", entityId: marker, seq: 2 },
      },
    });
    createdIds.push(second.id);
    const third = await prisma.realtimeEvent.create({
      data: {
        type: "catalog.changed",
        payload: { entityKind: "area", entityId: marker, seq: 3 },
      },
    });
    createdIds.push(third.id);

    try {
      const replay = await store.listAfter(
        first.id,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      );
      const ids = replay.filter((event) => {
        const payload = event.payload as { entityId?: string };
        return payload.entityId === marker;
      });
      expect(ids.map((event) => event.id)).toEqual([second.id, third.id]);

      const stale = await prisma.realtimeEvent.create({
        data: {
          type: "project.changed",
          payload: { entityKind: "project", entityId: marker, seq: 0 },
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        },
      });
      createdIds.push(stale.id);
      const now = new Date();
      expect(await evaluateRealtimeCursor(store, stale.id.toString(), now)).toEqual({
        kind: "expired",
      });
      expect(await evaluateRealtimeCursor(store, second.id.toString(), now)).toEqual({
        kind: "valid",
        id: second.id,
      });
    } finally {
      await prisma.realtimeEvent.deleteMany({ where: { id: { in: createdIds } } });
    }
  });

  it("delivers COMMIT+NOTIFY to every LISTEN replica on the same PostgreSQL", async ({
    skip,
  }) => {
    if (!prisma) {
      skip();
      return;
    }
    const url = getListenConnectionString();
    if (!url) {
      skip();
      return;
    }

    const store = createPrismaRealtimeEventStore(prisma);
    const replicaA = new RealtimeHub({ connectionString: url, store });
    const replicaB = new RealtimeHub({ connectionString: url, store });
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t21.listen/${suffix}`,
        oidcSubject: `sub-${suffix}`,
        displayName: "T21 listen",
      },
    });
    const area = await prisma.area.create({
      data: {
        name: `T21 Área listen ${suffix}`,
        nameNormalized: normalizeCatalogName(`T21 Área listen ${suffix}`),
      },
    });
    let projectId: string | undefined;

    try {
      await replicaA.ensureListening();
      await replicaB.ensureListening();
      const bufferedA = bufferHubEvents(replicaA);
      const bufferedB = bufferHubEvents(replicaB);

      const created = await runAuditedMutation({
        prisma,
        actor: { id: user.id },
        load: async () => null,
        mutate: (tx) =>
          tx.project.create({
            data: {
              name: `T21 live ${suffix}`,
              nameNormalized: normalizeCatalogName(`T21 live ${suffix}`),
              responsibleAreaId: area.id,
              architectureOwnerId: user.id,
              nature: "OPERATIONAL",
              architectureRole: "CONTRIBUTOR",
              status: "PLANNED",
              createdById: user.id,
              updatedById: user.id,
            },
          }),
        audit: ({ result }) => ({
          entityKind: AuditEntityKind.Project,
          entityId: result.id,
          action: AuditAction.created,
          projectId: result.id,
          changes: buildCreatedChanges({ name: result.name }),
        }),
      });
      projectId = created.id;

      const matchesCreated = (event: PersistedRealtimeEvent) => {
        const payload = event.payload as { entityId?: string };
        return payload.entityId === created.id;
      };
      const [eventA, eventB] = await Promise.all([
        bufferedA.waitFor(matchesCreated),
        bufferedB.waitFor(matchesCreated),
      ]);
      expect(eventA.id).toBe(eventB.id);
      expect(eventA.type).toBe("project.changed");
      expect(eventA.payload).toMatchObject({ entityKind: "project", entityId: created.id });
    } finally {
      await replicaA.close();
      await replicaB.close();
      if (projectId) {
        await prisma.auditEvent.deleteMany({ where: { entityId: projectId } });
        await prisma.realtimeEvent.deleteMany({
          where: {
            payload: {
              path: ["entityId"],
              equals: projectId,
            },
          },
        });
        await prisma.project.deleteMany({ where: { id: projectId } });
      }
      await prisma.area.delete({ where: { id: area.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
