import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import "dotenv/config";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { ConflictError, InvariantError, NotFoundError } from "@/domain/errors";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { createPrismaClient } from "@/infrastructure/db/create-prisma-client";
import {
  runAuditedMutation,
  type AuditedPrismaClient,
} from "@/infrastructure/db/audited-transaction";
import { buildCreatedChanges, buildUpdatedChanges } from "@/application/audit/changes";
import { PROJECT_AUDIT_FIELDS } from "@/application/audit/portrait";
import { InfrastructureError } from "@/infrastructure/errors";

const AUDITED_TEST_ISSUER = "https://integration-tests.invalid/kux-15/audited-transaction";
const occurredAt = new Date("2026-09-10T23:00:00.000Z");
const clock = { now: () => occurredAt };

function isCiEnv(): boolean {
  return process.env.CI === "true" || process.env.CI === "1";
}

/**
 * Local integration tests must use a disposable database. CI already provides
 * one through DATABASE_URL, so only CI may use that fallback.
 */
async function connectIntegrationDatabase(): Promise<PrismaClient | undefined> {
  const url = process.env.TEST_DATABASE_URL?.trim() || (isCiEnv() ? process.env.DATABASE_URL : undefined);
  if (!url) {
    if (isCiEnv()) {
      throw new Error("CI requires DATABASE_URL and a reachable PostgreSQL for integration tests.");
    }
    return undefined;
  }

  const client = createPrismaClient(url);
  try {
    await client.$queryRaw`SELECT 1`;
    return client;
  } catch {
    await client.$disconnect().catch(() => undefined);
    if (isCiEnv()) {
      throw new Error("CI requires a reachable PostgreSQL for integration tests.");
    }
    return undefined;
  }
}

function projectAuditFields(project: {
  name: string;
  status: string;
  responsibleAreaId: string;
  nature: string;
  architectureRole: string;
  startDate: Date | null;
  expectedEndDate: Date | null;
}) {
  return {
    name: project.name,
    status: project.status,
    responsibleAreaId: project.responsibleAreaId,
    nature: project.nature,
    architectureRole: project.architectureRole,
    participantIds: [] as string[],
    startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : null,
    expectedEndDate: project.expectedEndDate
      ? project.expectedEndDate.toISOString().slice(0, 10)
      : null,
  };
}

function prismaWithFailingAuditInsert(client: PrismaClient): AuditedPrismaClient {
  return {
    $transaction: (fn: (tx: Prisma.TransactionClient) => Promise<unknown>, options?: object) =>
      client.$transaction(async (tx) => {
        const failingTx = new Proxy(tx, {
          get(target, prop, receiver) {
            if (prop === "auditEvent") {
              return {
                create: async () => {
                  throw new Error("simulated AuditEvent insert failure");
                },
              };
            }
            return Reflect.get(target, prop, receiver);
          },
        }) as Prisma.TransactionClient;
        return fn(failingTx);
      }, options),
  } as AuditedPrismaClient;
}

async function loadProject(tx: Prisma.TransactionClient, id: string) {
  const project = await tx.project.findUnique({ where: { id } });
  if (!project) {
    throw new NotFoundError();
  }
  return project;
}

async function createProjectFixture(
  prisma: PrismaClient,
  key: string,
): Promise<{ userId: string; areaId: string; projectId: string }> {
  const prefix = `KUX-15 audited ${key}`;
  await deleteFixtureByKey(prisma, key);
  const user = await prisma.user.create({
    data: {
      oidcIssuer: AUDITED_TEST_ISSUER,
      oidcSubject: `project-${key}`,
      displayName: `${prefix} actor`,
    },
  });
  const area = await prisma.area.create({
    data: {
      name: `${prefix} area`,
      nameNormalized: normalizeCatalogName(`${prefix} area`),
    },
  });
  const project = await prisma.project.create({
    data: {
      name: `${prefix} project`,
      nameNormalized: normalizeCatalogName(`${prefix} project`),
      responsibleAreaId: area.id,
      nature: "STRATEGIC",
      architectureRole: "RESPONSIBLE",
      status: "PLANNED",
      createdById: user.id,
      updatedById: user.id,
    },
  });

  return { userId: user.id, areaId: area.id, projectId: project.id };
}

async function deleteRealtimeForEntity(prisma: PrismaClient, entityId: string): Promise<void> {
  await prisma.realtimeEvent.deleteMany({
    where: {
      payload: {
        path: ["entityId"],
        equals: entityId,
      },
    },
  });
}

async function deleteFixture(
  prisma: PrismaClient,
  fixture: { userId: string; areaId: string; projectId: string },
): Promise<void> {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { id: fixture.projectId },
        { createdById: fixture.userId },
        { updatedById: fixture.userId },
      ],
    },
    select: { id: true },
  });
  const projectIds = projects.map(({ id }) => id);
  await prisma.auditEvent.deleteMany({
    where: {
      OR: [{ actorUserId: fixture.userId }, { projectId: { in: projectIds } }],
    },
  });
  for (const projectId of projectIds) {
    await deleteRealtimeForEntity(prisma, projectId);
  }
  await prisma.projectParticipant.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.valueDelivery.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.area.deleteMany({ where: { id: fixture.areaId } });
  await prisma.user.deleteMany({ where: { id: fixture.userId } });
}

async function deleteFixtureByKey(prisma: PrismaClient, key: string): Promise<void> {
  const prefix = `KUX-15 audited ${key}`;
  const user = await prisma.user.findFirst({
    where: { oidcIssuer: AUDITED_TEST_ISSUER, oidcSubject: `project-${key}` },
    select: { id: true },
  });
  const area = await prisma.area.findFirst({
    where: { nameNormalized: normalizeCatalogName(`${prefix} area`) },
    select: { id: true },
  });

  if (user && area) {
    await deleteFixture(prisma, {
      userId: user.id,
      areaId: area.id,
      projectId: "00000000-0000-4000-8000-000000000000",
    });
    return;
  }

  const projects = await prisma.project.findMany({
    where: { nameNormalized: normalizeCatalogName(`${prefix} project`) },
    select: { id: true },
  });
  const projectIds = projects.map(({ id }) => id);
  await prisma.auditEvent.deleteMany({
    where: {
      OR: [
        ...(user ? [{ actorUserId: user.id }] : []),
        { projectId: { in: projectIds } },
      ],
    },
  });
  for (const projectId of projectIds) {
    await deleteRealtimeForEntity(prisma, projectId);
  }
  await prisma.projectParticipant.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.valueDelivery.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  if (area) {
    await prisma.area.delete({ where: { id: area.id } });
  }
  if (user) {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

describe("runAuditedMutation contract", () => {
  it("requires expectedVersion and versioned together", async () => {
    await expect(
      runAuditedMutation({
        prisma: {
          $transaction: async () => {
            throw new Error("transaction must not start");
          },
        } as AuditedPrismaClient,
        actor: { id: "00000000-0000-4000-8000-000000000001" },
        expectedVersion: 1,
        load: async () => null,
        mutate: async () => null,
        audit: () => ({
          entityKind: AuditEntityKind.Project,
          entityId: "00000000-0000-4000-8000-000000000002",
          action: AuditAction.field_changed,
          changes: buildUpdatedChanges({ name: "a" }, { name: "b" }),
        }),
      }),
    ).rejects.toBeInstanceOf(InvariantError);
  });
});

describe("runAuditedMutation (postgres)", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    prisma = await connectIntegrationDatabase();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("creates a Project and an AuditEvent snapshot in one transaction", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const key = "create";
    const prefix = `KUX-15 audited ${key}`;
    await deleteFixtureByKey(prisma, key);
    const user = await prisma.user.create({
      data: {
        oidcIssuer: AUDITED_TEST_ISSUER,
        oidcSubject: `project-${key}`,
        displayName: `${prefix} actor`,
      },
    });
    const area = await prisma.area.create({
      data: {
        name: `${prefix} area`,
        nameNormalized: normalizeCatalogName(`${prefix} area`),
      },
    });
    const publishRealtime = vi.fn();
    const notifyRealtime = vi.fn();

    try {
      const created = await runAuditedMutation({
        prisma,
        actor: { id: user.id },
        clock,
        publishRealtime,
        notifyRealtime,
        load: async () => null,
        mutate: (tx) =>
          tx.project.create({
            data: {
              name: "KUX-15 audited create result",
              nameNormalized: normalizeCatalogName("KUX-15 audited create result"),
              responsibleAreaId: area.id,
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
          changes: buildCreatedChanges(projectAuditFields(result)),
        }),
      });

      expect(created.version).toBe(1);
      expect(publishRealtime).toHaveBeenCalledOnce();
      expect(notifyRealtime).toHaveBeenCalledOnce();
      const notifiedIds = notifyRealtime.mock.calls[0]?.[0] as bigint[];
      expect(notifiedIds).toHaveLength(1);
      expect(typeof notifiedIds[0]).toBe("bigint");

      const events = await prisma.auditEvent.findMany({
        where: { entityId: created.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0]?.actorUserId).toBe(user.id);
      expect(events[0]?.occurredAt.toISOString()).toBe(occurredAt.toISOString());
      expect(events[0]?.action).toBe("created");
      expect(events[0]?.changes).toMatchObject({
        snapshot: { name: "KUX-15 audited create result", status: "PLANNED" },
        fields: { name: { before: null, after: "KUX-15 audited create result" } },
      });

      const realtime = await prisma.realtimeEvent.findMany({
        where: { id: { in: notifiedIds } },
      });
      expect(realtime).toHaveLength(1);
      expect(realtime[0]?.type).toBe("project.changed");
      expect(realtime[0]?.payload).toMatchObject({
        entityKind: "project",
        entityId: created.id,
      });
    } finally {
      await deleteFixtureByKey(prisma, key);
    }
  });

  it("rejects a stale version without overwriting and without a second audit event", async ({
    skip,
  }) => {
    if (!prisma) {
      skip();
      return;
    }
    const fixture = await createProjectFixture(prisma, "version");

    try {
      await runAuditedMutation({
        prisma,
        actor: { id: fixture.userId },
        clock,
        expectedVersion: 1,
        versioned: { model: "project", id: fixture.projectId },
        load: (tx) => loadProject(tx, fixture.projectId),
        mutate: (tx, loaded) => {
          if (!loaded) {
            throw new NotFoundError();
          }
          return tx.project.update({
            where: { id: loaded.id },
            data: {
              name: "KUX-15 audited version first",
              nameNormalized: normalizeCatalogName("KUX-15 audited version first"),
              updatedById: fixture.userId,
            },
          });
        },
        audit: ({ loaded, result }) => ({
          entityKind: AuditEntityKind.Project,
          entityId: result.id,
          action: AuditAction.field_changed,
          projectId: result.id,
          changes: buildUpdatedChanges(
            projectAuditFields(loaded),
            projectAuditFields(result),
            PROJECT_AUDIT_FIELDS,
          ),
        }),
      });

      await expect(
        runAuditedMutation({
          prisma,
          actor: { id: fixture.userId },
          clock,
          expectedVersion: 1,
          versioned: { model: "project", id: fixture.projectId },
          load: (tx) => loadProject(tx, fixture.projectId),
          mutate: (tx, loaded) => {
            if (!loaded) {
              throw new NotFoundError();
            }
            return tx.project.update({
              where: { id: loaded.id },
              data: {
                name: "KUX-15 audited version stale",
                nameNormalized: normalizeCatalogName("KUX-15 audited version stale"),
                updatedById: fixture.userId,
              },
            });
          },
          audit: ({ loaded, result }) => ({
            entityKind: AuditEntityKind.Project,
            entityId: result.id,
            action: AuditAction.field_changed,
            projectId: result.id,
            changes: buildUpdatedChanges(
              projectAuditFields(loaded),
              projectAuditFields(result),
              PROJECT_AUDIT_FIELDS,
            ),
          }),
        }),
      ).rejects.toBeInstanceOf(ConflictError);

      const project = await prisma.project.findUniqueOrThrow({
        where: { id: fixture.projectId },
      });
      expect(project.name).toBe("KUX-15 audited version first");
      expect(project.version).toBe(2);

      const events = await prisma.auditEvent.findMany({
        where: { entityId: fixture.projectId },
      });
      expect(events).toHaveLength(1);
    } finally {
      await deleteFixture(prisma, fixture);
    }
  });

  it("lets one of two concurrent edits commit and keeps only the winner's AuditEvent", async ({
    skip,
  }) => {
    if (!prisma) {
      skip();
      return;
    }
    const db = prisma;
    const fixture = await createProjectFixture(db, "concurrent");
    const nameA = "KUX-15 audited concurrent A";
    const nameB = "KUX-15 audited concurrent B";

    const edit = (name: string) =>
      runAuditedMutation({
        prisma: db,
        actor: { id: fixture.userId },
        clock,
        expectedVersion: 1,
        versioned: { model: "project", id: fixture.projectId },
        load: (tx) => loadProject(tx, fixture.projectId),
        mutate: (tx, loaded) => {
          if (!loaded) {
            throw new NotFoundError();
          }
          return tx.project.update({
            where: { id: loaded.id },
            data: {
              name,
              nameNormalized: normalizeCatalogName(name),
              updatedById: fixture.userId,
            },
          });
        },
        audit: ({ loaded, result }) => ({
          entityKind: AuditEntityKind.Project,
          entityId: result.id,
          action: AuditAction.field_changed,
          projectId: result.id,
          changes: buildUpdatedChanges(
            projectAuditFields(loaded),
            projectAuditFields(result),
            PROJECT_AUDIT_FIELDS,
          ),
        }),
      });

    try {
      const outcomes = await Promise.allSettled([edit(nameA), edit(nameB)]);
      const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled");
      const rejected = outcomes.filter((outcome) => outcome.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const failed = rejected[0];
      expect(failed?.status).toBe("rejected");
      if (failed?.status === "rejected") {
        expect(failed.reason).toBeInstanceOf(ConflictError);
      }

      const project = await prisma.project.findUniqueOrThrow({
        where: { id: fixture.projectId },
      });
      expect([nameA, nameB]).toContain(project.name);
      expect(project.version).toBe(2);

      const events = await prisma.auditEvent.findMany({
        where: { entityId: fixture.projectId },
        orderBy: [{ occurredAt: "asc" }, { sequence: "asc" }],
      });
      expect(events).toHaveLength(1);
      expect(events[0]?.action).toBe("field_changed");
      const changes = events[0]?.changes as {
        fields: { name: { after: string } };
      };
      expect(changes.fields.name.after).toBe(project.name);
    } finally {
      await deleteFixture(prisma, fixture);
    }
  });

  it("rolls back the mutation when AuditEvent insert fails", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const fixture = await createProjectFixture(prisma, "rollback");
    const original = await prisma.project.findUniqueOrThrow({
      where: { id: fixture.projectId },
    });

    const notifyRealtime = vi.fn();

    try {
      await expect(
        runAuditedMutation({
          prisma: prismaWithFailingAuditInsert(prisma),
          actor: { id: fixture.userId },
          clock,
          notifyRealtime,
          expectedVersion: 1,
          versioned: { model: "project", id: fixture.projectId },
          load: (tx) => loadProject(tx, fixture.projectId),
          mutate: (tx, loaded) => {
            if (!loaded) {
              throw new NotFoundError();
            }
            return tx.project.update({
              where: { id: loaded.id },
              data: {
                name: "KUX-15 audited rollback result",
                nameNormalized: normalizeCatalogName("KUX-15 audited rollback result"),
                updatedById: fixture.userId,
              },
            });
          },
          audit: ({ loaded, result }) => ({
            entityKind: AuditEntityKind.Project,
            entityId: result.id,
            action: AuditAction.field_changed,
            projectId: result.id,
            changes: buildUpdatedChanges(
              projectAuditFields(loaded),
              projectAuditFields(result),
              PROJECT_AUDIT_FIELDS,
            ),
          }),
        }),
      ).rejects.toBeInstanceOf(InfrastructureError);

      const project = await prisma.project.findUniqueOrThrow({
        where: { id: fixture.projectId },
      });
      expect(project.name).toBe(original.name);
      expect(project.version).toBe(1);

      const events = await prisma.auditEvent.findMany({
        where: { entityId: fixture.projectId },
      });
      expect(events).toHaveLength(0);
      expect(notifyRealtime).not.toHaveBeenCalled();

      const realtime = await prisma.realtimeEvent.findMany({
        where: {
          payload: {
            path: ["entityId"],
            equals: fixture.projectId,
          },
        },
      });
      expect(realtime).toHaveLength(0);
    } finally {
      await deleteFixture(prisma, fixture);
    }
  });
});
