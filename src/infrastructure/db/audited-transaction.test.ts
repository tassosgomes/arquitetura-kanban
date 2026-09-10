import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import "dotenv/config";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { ConflictError, InvariantError, NotFoundError } from "@/domain/errors";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import {
  runAuditedMutation,
  type AuditedPrismaClient,
} from "@/infrastructure/db/audited-transaction";
import { buildCreatedChanges, buildUpdatedChanges } from "@/application/audit/changes";
import { PROJECT_AUDIT_FIELDS } from "@/application/audit/portrait";
import { InfrastructureError } from "@/infrastructure/errors";

const occurredAt = new Date("2026-09-10T23:00:00.000Z");
const clock = { now: () => occurredAt };

function projectAuditFields(project: {
  name: string;
  status: string;
  architectureOwnerId: string;
  responsibleAreaId: string;
  nature: string;
  architectureRole: string;
  startDate: Date | null;
  expectedEndDate: Date | null;
}) {
  return {
    name: project.name,
    status: project.status,
    architectureOwnerId: project.architectureOwnerId,
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
  suffix: string,
): Promise<{ userId: string; areaId: string; projectId: string }> {
  const user = await prisma.user.create({
    data: {
      oidcIssuer: `https://t12.test/${suffix}`,
      oidcSubject: `sub-${suffix}`,
      displayName: "T12 actor",
    },
  });
  const area = await prisma.area.create({
    data: {
      name: `T12 Área ${suffix}`,
      nameNormalized: normalizeCatalogName(`T12 Área ${suffix}`),
    },
  });
  const project = await prisma.project.create({
    data: {
      name: `T12 Projeto ${suffix}`,
      nameNormalized: normalizeCatalogName(`T12 Projeto ${suffix}`),
      responsibleAreaId: area.id,
      architectureOwnerId: user.id,
      nature: "STRATEGIC",
      architectureRole: "RESPONSIBLE",
      status: "PLANNED",
      createdById: user.id,
      updatedById: user.id,
    },
  });

  return { userId: user.id, areaId: area.id, projectId: project.id };
}

async function deleteFixture(
  prisma: PrismaClient,
  fixture: { userId: string; areaId: string; projectId: string },
): Promise<void> {
  await prisma.auditEvent.deleteMany({
    where: { OR: [{ actorUserId: fixture.userId }, { projectId: fixture.projectId }] },
  });
  await prisma.project.deleteMany({ where: { id: fixture.projectId } });
  await prisma.area.deleteMany({ where: { id: fixture.areaId } });
  await prisma.user.deleteMany({ where: { id: fixture.userId } });
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
    prisma = await connectPostgresForTests();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("creates a Project and an AuditEvent snapshot in one transaction", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t12.test/${suffix}`,
        oidcSubject: `sub-${suffix}`,
        displayName: "T12 create actor",
      },
    });
    const area = await prisma.area.create({
      data: {
        name: `T12 Área create ${suffix}`,
        nameNormalized: normalizeCatalogName(`T12 Área create ${suffix}`),
      },
    });
    const publishRealtime = vi.fn();

    try {
      const created = await runAuditedMutation({
        prisma,
        actor: { id: user.id },
        clock,
        publishRealtime,
        load: async () => null,
        mutate: (tx) =>
          tx.project.create({
            data: {
              name: `T12 created ${suffix}`,
              nameNormalized: normalizeCatalogName(`T12 created ${suffix}`),
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
          changes: buildCreatedChanges(projectAuditFields(result)),
        }),
      });

      expect(created.version).toBe(1);
      expect(publishRealtime).not.toHaveBeenCalled();

      const events = await prisma.auditEvent.findMany({
        where: { entityId: created.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0]?.actorUserId).toBe(user.id);
      expect(events[0]?.occurredAt.toISOString()).toBe(occurredAt.toISOString());
      expect(events[0]?.action).toBe("created");
      expect(events[0]?.changes).toMatchObject({
        snapshot: { name: `T12 created ${suffix}`, status: "PLANNED" },
        fields: { name: { before: null, after: `T12 created ${suffix}` } },
      });
    } finally {
      await prisma.auditEvent.deleteMany({ where: { actorUserId: user.id } });
      await prisma.project.deleteMany({ where: { createdById: user.id } });
      await prisma.area.delete({ where: { id: area.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("rejects a stale version without overwriting and without a second audit event", async ({
    skip,
  }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const fixture = await createProjectFixture(prisma, suffix);

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
              name: `T12 first ${suffix}`,
              nameNormalized: normalizeCatalogName(`T12 first ${suffix}`),
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
                name: `T12 stale ${suffix}`,
                nameNormalized: normalizeCatalogName(`T12 stale ${suffix}`),
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
      expect(project.name).toBe(`T12 first ${suffix}`);
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
    const suffix = randomUUID();
    const fixture = await createProjectFixture(db, suffix);
    const nameA = `T12 concurrent A ${suffix}`;
    const nameB = `T12 concurrent B ${suffix}`;

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
    const suffix = randomUUID();
    const fixture = await createProjectFixture(prisma, suffix);
    const original = await prisma.project.findUniqueOrThrow({
      where: { id: fixture.projectId },
    });

    try {
      await expect(
        runAuditedMutation({
          prisma: prismaWithFailingAuditInsert(prisma),
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
                name: `T12 rolled back ${suffix}`,
                nameNormalized: normalizeCatalogName(`T12 rolled back ${suffix}`),
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
    } finally {
      await deleteFixture(prisma, fixture);
    }
  });
});
