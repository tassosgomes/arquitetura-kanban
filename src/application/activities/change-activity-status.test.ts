import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, InvariantError, ValidationError } from "@/domain/errors";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { instantToCivilDate } from "@/domain/calendar/civil-date";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { InfrastructureError } from "@/infrastructure/errors";
import type { CreateActivityInput } from "@/application/activities";
import {
  changeActivityStatus,
  createActivity,
  updateActivity,
} from "@/application/activities";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import type { AuditedPrismaClient } from "@/infrastructure/db/audited-transaction";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";

const SP = "America/Sao_Paulo";
const referenceNow = new Date("2026-09-10T18:00:00.000Z");
const referenceToday = instantToCivilDate(referenceNow, SP);
const clock = { now: () => referenceNow };

type AuditChanges = {
  fields?: Record<string, { before: unknown; after: unknown }>;
};

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

describe("changeActivityStatus (postgres)", () => {
  let prisma: PrismaClient | undefined;
  let actor: LocalUser | undefined;
  const areaIds: string[] = [];
  const domainIds: string[] = [];
  const userIds: string[] = [];
  const activityIds: string[] = [];

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
    if (!prisma) {
      return;
    }

    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t14.test/${randomUUID()}`,
        oidcSubject: "t14-actor",
        displayName: "T14 actor",
        isActive: true,
      },
    });
    userIds.push(user.id);
    actor = {
      id: user.id,
      oidcIssuer: user.oidcIssuer,
      oidcSubject: user.oidcSubject,
      isActive: true,
    };
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    await prisma.auditEvent.deleteMany({
      where: {
        OR: [{ activityId: { in: activityIds } }, { actorUserId: { in: userIds } }],
      },
    });
    await prisma.activityParticipant.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activityInvolvedArea.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activityTask.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
    await prisma.area.deleteMany({ where: { id: { in: areaIds } } });
    await prisma.architectureDomain.deleteMany({ where: { id: { in: domainIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  function deps(overrides: { prisma?: AuditedPrismaClient } = {}) {
    if (!prisma) {
      throw new Error("prisma is required");
    }
    return {
      activities: createPrismaActivityRepository(prisma),
      projects: createPrismaProjectRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      domains: createPrismaDomainRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      prisma: overrides.prisma ?? prisma,
      clock,
    };
  }

  async function fixtures(suffix: string) {
    if (!prisma) {
      throw new Error("prisma is required");
    }
    const area = await prisma.area.create({
      data: {
        name: `T14 Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T14 Área ${suffix}`),
      },
    });
    areaIds.push(area.id);

    const domain = await prisma.architectureDomain.create({
      data: {
        name: `T14 Domínio ${suffix}`,
        nameNormalized: normalizeCatalogName(`T14 Domínio ${suffix}`),
      },
    });
    domainIds.push(domain.id);

    const owner = await prisma.user.create({
      data: {
        oidcIssuer: `https://t14.test/${suffix}`,
        oidcSubject: `owner-${suffix}`,
        displayName: `Owner ${suffix}`,
        isActive: true,
      },
    });
    userIds.push(owner.id);

    return { area, domain, owner };
  }

  function adHocInput(
    areaId: string,
    domainId: string,
    ownerId: string,
    title: string,
    overrides: Partial<CreateActivityInput> = {},
  ): CreateActivityInput {
    return {
      title,
      description: null,
      observations: null,
      type: ActivityType.AD_HOC,
      projectId: null,
      requestingAreaId: areaId,
      domainId,
      nature: Nature.STRATEGIC,
      architectureRole: ArchitectureRole.RESPONSIBLE,
      ownerId,
      participantIds: [],
      involvedAreaIds: [],
      priority: Priority.MEDIUM,
      effort: null,
      status: ActivityStatus.BACKLOG,
      startDate: null,
      expectedEndDate: null,
      completedDate: null,
      ...overrides,
    };
  }

  async function seed(title: string, overrides: Partial<CreateActivityInput> = {}) {
    if (!actor) {
      throw new Error("actor is required");
    }
    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `${title} ${suffix}`, overrides),
      deps(),
    );
    activityIds.push(created.id);
    return { created, area, domain, owner, suffix };
  }

  async function eventsFor(activityId: string) {
    if (!prisma) {
      throw new Error("prisma is required");
    }
    return prisma.auditEvent.findMany({
      where: { entityId: activityId },
      orderBy: [{ sequence: "asc" }],
    });
  }

  it("fills start on first In progress, keeps it on resume, and records status + date audit (FX-01)", async ({
    skip,
  }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 auto início");
    const started = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.IN_PROGRESS },
      deps(),
    );
    expect(started.status).toBe(ActivityStatus.IN_PROGRESS);
    expect(started.startDate).toBe(referenceToday);
    expect(started.version).toBe(created.version + 1);

    const waiting = await changeActivityStatus(
      actor,
      { id: started.id, version: started.version, status: ActivityStatus.WAITING },
      deps(),
    );
    const resumed = await changeActivityStatus(
      actor,
      { id: waiting.id, version: waiting.version, status: ActivityStatus.IN_PROGRESS },
      deps(),
    );
    expect(resumed.startDate).toBe(referenceToday);

    const events = await eventsFor(created.id);
    const startChange = events.find(
      (event) =>
        event.action === AuditAction.field_changed &&
        (event.changes as AuditChanges).fields?.dataInicio,
    );
    expect(startChange).toBeDefined();
    expect((startChange?.changes as AuditChanges).fields?.dataInicio).toEqual({
      before: null,
      after: referenceToday,
    });
    expect(startChange?.actorUserId).toBe(actor.id);
    expect(startChange?.occurredAt.toISOString()).toBe(referenceNow.toISOString());

    const lastStatus = [...events].reverse().find((event) => event.action === AuditAction.status_changed);
    expect(lastStatus?.action).toBe(AuditAction.status_changed);
    expect((lastStatus?.changes as AuditChanges).fields?.status).toEqual({
      before: ActivityStatus.WAITING,
      after: ActivityStatus.IN_PROGRESS,
    });
    expect(
      events.filter(
        (event) =>
          event.action === AuditAction.field_changed &&
          (event.changes as AuditChanges).fields?.dataInicio?.before === referenceToday,
      ),
    ).toHaveLength(0);
  });

  it("fills completedDate and does not invent a start on direct conclusion (FX-13 / DE-09)", async ({
    skip,
  }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 conclusão direta");
    const done = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.DONE },
      deps(),
    );
    expect(done.status).toBe(ActivityStatus.DONE);
    expect(done.startDate).toBeNull();
    expect(done.completedDate).toBe(referenceToday);

    const events = await eventsFor(created.id);
    const statusEvent = events.find((event) => event.action === AuditAction.status_changed);
    const dateEvent = events.find((event) => event.action === AuditAction.field_changed);
    expect(statusEvent?.entityKind).toBe(AuditEntityKind.Activity);
    expect((statusEvent?.changes as AuditChanges).fields?.status).toEqual({
      before: ActivityStatus.BACKLOG,
      after: ActivityStatus.DONE,
    });
    expect((dateEvent?.changes as AuditChanges).fields?.dataConclusao).toEqual({
      before: null,
      after: referenceToday,
    });
    expect((dateEvent?.changes as AuditChanges).fields?.dataInicio).toBeUndefined();
  });

  it("reopens Done, clears completedDate, preserves start and prior events (FX-05 / DE-06)", async ({
    skip,
  }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 reabertura", {
      status: ActivityStatus.IN_PROGRESS,
      startDate: "2026-08-01",
    });
    expect(created.startDate).toBe("2026-08-01");

    const done = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.DONE },
      deps(),
    );
    expect(done.completedDate).toBe(referenceToday);

    const beforeReopen = await eventsFor(created.id);
    const reopened = await changeActivityStatus(actor, { id: done.id, version: done.version }, deps());
    expect(reopened.status).toBe(ActivityStatus.IN_PROGRESS);
    expect(reopened.startDate).toBe("2026-08-01");
    expect(reopened.completedDate).toBeNull();

    const after = await eventsFor(created.id);
    expect(after.length).toBeGreaterThan(beforeReopen.length);
    expect(after.filter((event) => event.action === AuditAction.created)).toHaveLength(1);
    expect(
      after.some(
        (event) =>
          event.action === AuditAction.status_changed &&
          (event.changes as AuditChanges).fields?.status?.before === ActivityStatus.DONE &&
          (event.changes as AuditChanges).fields?.status?.after === ActivityStatus.IN_PROGRESS,
      ),
    ).toBe(true);
    const clearCompletion = after.find(
      (event) =>
        event.action === AuditAction.field_changed &&
        (event.changes as AuditChanges).fields?.dataConclusao?.before === referenceToday &&
        (event.changes as AuditChanges).fields?.dataConclusao?.after === null,
    );
    expect(clearCompletion).toBeDefined();
  });

  it("applies DE-23 when reopening a direct conclusion to In progress (FX-13b)", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 reopen DE-23");
    const done = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.DONE },
      deps(),
    );
    expect(done.startDate).toBeNull();

    const reopened = await changeActivityStatus(
      actor,
      { id: done.id, version: done.version, status: ActivityStatus.IN_PROGRESS },
      deps(),
    );
    expect(reopened.startDate).toBe(referenceToday);
    expect(reopened.completedDate).toBeNull();
  });

  it("cancels from any status, fills cancelledDate, and rejects further transitions (FX-06)", async ({
    skip,
  }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 terminal", { status: ActivityStatus.IN_PROGRESS });
    const cancelled = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.CANCELLED },
      deps(),
    );
    expect(cancelled.status).toBe(ActivityStatus.CANCELLED);
    expect(cancelled.cancelledDate).toBe(referenceToday);
    expect(cancelled.startDate).toBe(referenceToday);

    const events = await eventsFor(created.id);
    expect(events.some((event) => event.action === AuditAction.cancelled)).toBe(true);
    const dateEvent = events.find(
      (event) =>
        event.action === AuditAction.field_changed &&
        (event.changes as AuditChanges).fields?.dataCancelamento,
    );
    expect((dateEvent?.changes as AuditChanges).fields?.dataCancelamento).toEqual({
      before: null,
      after: referenceToday,
    });

    await expect(
      changeActivityStatus(
        actor,
        { id: cancelled.id, version: cancelled.version, status: ActivityStatus.TODO },
        deps(),
      ),
    ).rejects.toBeInstanceOf(InvariantError);

    const still = await prisma.activity.findUnique({ where: { id: created.id } });
    expect(still?.status).toBe("CANCELLED");
    expect(still?.version).toBe(cancelled.version);
  });

  it("treats Done → Cancelled as cancellation, not reopen", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 done-cancel", {
      status: ActivityStatus.IN_PROGRESS,
      startDate: "2026-08-01",
    });
    const done = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.DONE },
      deps(),
    );
    const cancelled = await changeActivityStatus(
      actor,
      { id: done.id, version: done.version, status: ActivityStatus.CANCELLED },
      deps(),
    );
    expect(cancelled.status).toBe(ActivityStatus.CANCELLED);
    expect(cancelled.cancelledDate).toBe(referenceToday);
    expect(cancelled.completedDate).toBe(referenceToday);
    expect(cancelled.startDate).toBe("2026-08-01");
  });

  it("rejects a stale version without changing status (conflict)", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 conflito");
    const first = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.TODO },
      deps(),
    );
    expect(first.status).toBe(ActivityStatus.TODO);

    await expect(
      changeActivityStatus(
        actor,
        { id: created.id, version: created.version, status: ActivityStatus.BLOCKED },
        deps(),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    const persisted = await prisma.activity.findUnique({ where: { id: created.id } });
    expect(persisted?.status).toBe("TODO");
    expect(persisted?.version).toBe(first.version);
  });

  it("does not call the audit helper on same-status no-op", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 noop");
    const before = await eventsFor(created.id);
    const same = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.BACKLOG },
      deps(),
    );
    expect(same.status).toBe(ActivityStatus.BACKLOG);
    expect(same.version).toBe(created.version);
    const after = await eventsFor(created.id);
    expect(after).toHaveLength(before.length);
  });

  it("rolls back status when audit insert fails (atomic)", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 atômico");
    const beforeEvents = await eventsFor(created.id);

    await expect(
      changeActivityStatus(
        actor,
        { id: created.id, version: created.version, status: ActivityStatus.IN_PROGRESS },
        deps({ prisma: prismaWithFailingAuditInsert(prisma) }),
      ),
    ).rejects.toBeInstanceOf(InfrastructureError);

    const persisted = await prisma.activity.findUnique({ where: { id: created.id } });
    expect(persisted?.status).toBe("BACKLOG");
    expect(persisted?.startDate).toBeNull();
    expect(persisted?.version).toBe(created.version);
    expect(await eventsFor(created.id)).toHaveLength(beforeEvents.length);
  });

  it("uses the São Paulo civil day of occurred_at, not UTC date (FX-14a)", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const zoneClock = { now: () => new Date("2026-09-01T01:30:00.000Z") };
    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T14 fuso ${suffix}`),
      { ...deps(), clock: zoneClock },
    );
    activityIds.push(created.id);

    const started = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.IN_PROGRESS },
      { ...deps(), clock: zoneClock },
    );
    expect(started.startDate).toBe("2026-08-31");
    expect(started.startDate).not.toBe("2026-09-01");
  });

  it("requires a destination unless reopening Done", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created } = await seed("T14 destino");
    await expect(
      changeActivityStatus(actor, { id: created.id, version: created.version }, deps()),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("does not allow changing status through updateActivity", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const { created, area, domain, owner } = await seed("T14 update status");
    await expect(
      updateActivity(
        actor,
        {
          id: created.id,
          version: created.version,
          title: created.title,
          description: created.description,
          observations: created.observations,
          type: created.type,
          projectId: null,
          requestingAreaId: area.id,
          domainId: domain.id,
          nature: created.nature,
          architectureRole: created.architectureRole,
          ownerId: owner.id,
          participantIds: [],
          involvedAreaIds: [],
          priority: created.priority,
          effort: created.effort,
          status: ActivityStatus.TODO,
          startDate: created.startDate,
          expectedEndDate: created.expectedEndDate,
          completedDate: created.completedDate,
        },
        deps(),
      ),
    ).rejects.toBeInstanceOf(InvariantError);
  });
});
