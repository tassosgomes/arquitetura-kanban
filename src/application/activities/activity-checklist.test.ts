import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ConflictError, InvariantError } from "@/domain/errors";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { formatChecklistProgress } from "@/domain/activity/checklist";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import type { CreateActivityInput } from "@/application/activities";
import {
  addActivityTask,
  createActivity,
  getActivity,
  removeActivityTask,
  reorderActivityTasks,
  toggleActivityTask,
  updateActivityTask,
} from "@/application/activities";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";

describe("activity checklist (postgres)", () => {
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
        oidcIssuer: `https://t15.test/${randomUUID()}`,
        oidcSubject: "t15-actor",
        displayName: "T15 actor",
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

  function deps() {
    if (!prisma) {
      throw new Error("prisma is required");
    }
    return {
      activities: createPrismaActivityRepository(prisma),
      projects: createPrismaProjectRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      domains: createPrismaDomainRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      prisma,
    };
  }

  async function fixtures(suffix: string) {
    if (!prisma) {
      throw new Error("prisma is required");
    }
    const area = await prisma.area.create({
      data: {
        name: `T15 Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T15 Área ${suffix}`),
      },
    });
    areaIds.push(area.id);

    const domain = await prisma.architectureDomain.create({
      data: {
        name: `T15 Domínio ${suffix}`,
        nameNormalized: normalizeCatalogName(`T15 Domínio ${suffix}`),
      },
    });
    domainIds.push(domain.id);

    const owner = await prisma.user.create({
      data: {
        oidcIssuer: `https://t15.test/${suffix}`,
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
      status: ActivityStatus.IN_PROGRESS,
      startDate: "2026-09-01",
      expectedEndDate: null,
      completedDate: null,
      ...overrides,
    };
  }

  it("allows zero tasks and reports progress 0/0", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T15 Vazio ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    expect(created.tasks).toEqual([]);
    expect(formatChecklistProgress(created.tasks)).toBe("0/0");

    const loaded = await getActivity(actor, created.id, deps().activities);
    expect(loaded?.tasks).toEqual([]);
    expect(loaded?.status).toBe(ActivityStatus.IN_PROGRESS);
  });

  it("persists order after reload and keeps progress X/Y", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T15 Ordem ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    const first = await addActivityTask(
      actor,
      { activityId: created.id, version: created.version, description: "Levantar integrações" },
      deps(),
    );
    const second = await addActivityTask(
      actor,
      { activityId: first.id, version: first.version, description: "Validar requisitos" },
      deps(),
    );
    const third = await addActivityTask(
      actor,
      { activityId: second.id, version: second.version, description: "Elaborar diagrama" },
      deps(),
    );

    expect(third.tasks.map((task) => task.description)).toEqual([
      "Levantar integrações",
      "Validar requisitos",
      "Elaborar diagrama",
    ]);
    expect(formatChecklistProgress(third.tasks)).toBe("0/3");

    const reorderedIds = [third.tasks[2]!.id, third.tasks[0]!.id, third.tasks[1]!.id];
    const reordered = await reorderActivityTasks(
      actor,
      { activityId: created.id, version: third.version, orderedTaskIds: reorderedIds },
      deps(),
    );
    expect(reordered.tasks.map((task) => task.description)).toEqual([
      "Elaborar diagrama",
      "Levantar integrações",
      "Validar requisitos",
    ]);
    expect(reordered.tasks.map((task) => task.sortOrder)).toEqual([0, 1, 2]);

    const loaded = await getActivity(actor, created.id, deps().activities);
    expect(loaded?.tasks.map((task) => task.description)).toEqual([
      "Elaborar diagrama",
      "Levantar integrações",
      "Validar requisitos",
    ]);

    const marked = await toggleActivityTask(
      actor,
      {
        activityId: created.id,
        taskId: reordered.tasks[1]!.id,
        version: reordered.version,
        isDone: true,
      },
      deps(),
    );
    expect(formatChecklistProgress(marked.tasks)).toBe("1/3");
    expect(marked.status).toBe(ActivityStatus.IN_PROGRESS);
  });

  it("does not change activity status when every item is completed", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T15 RN-20 ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    const withFirst = await addActivityTask(
      actor,
      { activityId: created.id, version: created.version, description: "Item A" },
      deps(),
    );
    const withSecond = await addActivityTask(
      actor,
      { activityId: created.id, version: withFirst.version, description: "Item B" },
      deps(),
    );

    const afterA = await toggleActivityTask(
      actor,
      {
        activityId: created.id,
        taskId: withSecond.tasks[0]!.id,
        version: withSecond.version,
        isDone: true,
      },
      deps(),
    );
    const afterB = await toggleActivityTask(
      actor,
      {
        activityId: created.id,
        taskId: afterA.tasks[1]!.id,
        version: afterA.version,
        isDone: true,
      },
      deps(),
    );

    expect(formatChecklistProgress(afterB.tasks)).toBe("2/2");
    expect(afterB.status).toBe(ActivityStatus.IN_PROGRESS);
    expect(afterB.tasks.every((task) => task.isDone)).toBe(true);

    const persisted = await prisma.activity.findUnique({ where: { id: created.id } });
    expect(persisted?.status).toBe("IN_PROGRESS");

    const statusEvents = await prisma.auditEvent.findMany({
      where: { entityId: created.id, entityKind: AuditEntityKind.Activity },
    });
    expect(statusEvents.every((event) => event.action !== AuditAction.status_changed)).toBe(true);
    for (const event of statusEvents) {
      const changes = event.changes as { fields?: Record<string, { after?: unknown }> };
      if (changes.fields?.status) {
        expect(changes.fields.status.after).not.toBe("DONE");
      }
    }
  });

  it("rejects a stale version without dropping the other session's checklist change", async ({
    skip,
  }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T15 Conflito ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    const first = await addActivityTask(
      actor,
      { activityId: created.id, version: created.version, description: "Tarefa vencedora" },
      deps(),
    );
    expect(first.version).toBe(created.version + 1);

    await expect(
      addActivityTask(
        actor,
        { activityId: created.id, version: created.version, description: "não deve persistir" },
        deps(),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    const loaded = await getActivity(actor, created.id, deps().activities);
    expect(loaded?.tasks.map((task) => task.description)).toEqual(["Tarefa vencedora"]);
    expect(loaded?.version).toBe(first.version);

    const events = await prisma.auditEvent.findMany({
      where: { activityId: created.id, entityKind: AuditEntityKind.ActivityTask },
      orderBy: { sequence: "asc" },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.entityId).toBe(first.tasks[0]?.id);
    expect(events[0]?.activityId).toBe(created.id);
    expect(events[0]?.action).toBe(AuditAction.created);
    const changes = events[0]?.changes as { snapshot?: Record<string, unknown> };
    expect(changes.snapshot?.description).toBe("Tarefa vencedora");
    expect(changes.snapshot).not.toHaveProperty("status");
  });

  it("edits, removes the last task, and keeps a cancelled activity read-only", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T15 Remoção ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    const added = await addActivityTask(
      actor,
      { activityId: created.id, version: created.version, description: "Texto antigo" },
      deps(),
    );
    const renamed = await updateActivityTask(
      actor,
      {
        activityId: created.id,
        taskId: added.tasks[0]!.id,
        version: added.version,
        description: "Texto novo",
      },
      deps(),
    );
    expect(renamed.tasks[0]?.description).toBe("Texto novo");

    const emptied = await removeActivityTask(
      actor,
      {
        activityId: created.id,
        taskId: renamed.tasks[0]!.id,
        version: renamed.version,
      },
      deps(),
    );
    expect(emptied.tasks).toEqual([]);
    expect(formatChecklistProgress(emptied.tasks)).toBe("0/0");
    expect(emptied.status).toBe(ActivityStatus.IN_PROGRESS);

    await prisma.activity.update({
      where: { id: created.id },
      data: { status: "CANCELLED" },
    });
    const cancelled = await getActivity(actor, created.id, deps().activities);

    await expect(
      addActivityTask(
        actor,
        { activityId: created.id, version: cancelled?.version ?? emptied.version, description: "bloqueada" },
        deps(),
      ),
    ).rejects.toBeInstanceOf(InvariantError);
  });
});
