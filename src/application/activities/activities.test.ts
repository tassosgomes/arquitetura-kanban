import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ConflictError, InvariantError, ValidationError } from "@/domain/errors";
import { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ProjectStatus } from "@/domain/project/project-status";
import { instantToCivilDate } from "@/domain/calendar/civil-date";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { ACTIVITY_PORTRAIT_FIELDS } from "@/application/audit";
import { createProject } from "@/application/projects";
import type { CreateProjectInput } from "@/application/projects";
import {
  createActivity,
  getActivity,
  getProjectDefaults,
  listActivities,
  updateActivity,
} from "@/application/activities";
import type { CreateActivityInput } from "@/application/activities";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";

describe("activity services (postgres)", () => {
  let prisma: PrismaClient | undefined;
  let actor: LocalUser | undefined;
  const areaIds: string[] = [];
  const domainIds: string[] = [];
  const userIds: string[] = [];
  const projectIds: string[] = [];
  const activityIds: string[] = [];

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
    if (!prisma) {
      return;
    }

    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t13.test/${randomUUID()}`,
        oidcSubject: "t13-actor",
        displayName: "T13 actor",
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
        OR: [
          { activityId: { in: activityIds } },
          { projectId: { in: projectIds } },
          { actorUserId: { in: userIds } },
        ],
      },
    });
    await prisma.activityParticipant.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activityInvolvedArea.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activityTask.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
    await prisma.projectParticipant.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
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
        name: `T13 Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T13 Área ${suffix}`),
      },
    });
    areaIds.push(area.id);

    const domain = await prisma.architectureDomain.create({
      data: {
        name: `T13 Domínio ${suffix}`,
        nameNormalized: normalizeCatalogName(`T13 Domínio ${suffix}`),
      },
    });
    domainIds.push(domain.id);

    const owner = await prisma.user.create({
      data: {
        oidcIssuer: `https://t13.test/${suffix}`,
        oidcSubject: `owner-${suffix}`,
        displayName: `Owner ${suffix}`,
        isActive: true,
      },
    });
    userIds.push(owner.id);

    const participant = await prisma.user.create({
      data: {
        oidcIssuer: `https://t13.test/${suffix}-p`,
        oidcSubject: `participant-${suffix}`,
        displayName: `Participant ${suffix}`,
        isActive: true,
      },
    });
    userIds.push(participant.id);

    return { area, domain, owner, participant };
  }

  function projectInput(
    areaId: string,
    ownerId: string,
    name: string,
    overrides: Partial<CreateProjectInput> = {},
  ): CreateProjectInput {
    return {
      name,
      description: null,
      responsibleAreaId: areaId,
      externalResponsible: null,
      architectureOwnerId: ownerId,
      participantIds: [],
      architectureRole: ArchitectureRole.RESPONSIBLE,
      nature: Nature.STRATEGIC,
      startDate: null,
      expectedEndDate: null,
      status: ProjectStatus.PLANNED,
      ...overrides,
    };
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

  it("creates an ad hoc activity and an activity linked to a project", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner, participant } = await fixtures(suffix);
    const adHoc = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T13 Ad hoc ${suffix}`),
      deps(),
    );
    activityIds.push(adHoc.id);

    expect(adHoc.type).toBe(ActivityType.AD_HOC);
    expect(adHoc.project).toBeNull();
    expect(adHoc.owner.id).toBe(owner.id);
    expect(adHoc.createdBy.id).toBe(actor.id);
    expect(adHoc.version).toBe(1);

    const project = await createProject(
      actor,
      projectInput(area.id, owner.id, `T13 Projeto ${suffix}`, {
        participantIds: [participant.id],
        nature: Nature.OPERATIONAL,
        architectureRole: ArchitectureRole.CONTRIBUTOR,
      }),
      deps(),
    );
    projectIds.push(project.id);

    const linked = await createActivity(
      actor,
      {
        ...adHocInput(area.id, domain.id, owner.id, `T13 Vinculada ${suffix}`),
        type: ActivityType.PROJECT,
        projectId: project.id,
      },
      deps(),
    );
    activityIds.push(linked.id);

    expect(linked.type).toBe(ActivityType.PROJECT);
    expect(linked.project?.id).toBe(project.id);
    expect(linked.owner.id).toBe(owner.id);
  });

  it("rejects tipo Projeto without projectId", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);

    await expect(
      createActivity(
        actor,
        {
          ...adHocInput(area.id, domain.id, owner.id, `T13 Sem projeto ${suffix}`),
          type: ActivityType.PROJECT,
          projectId: null,
        },
        deps(),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("fills inheritance from the project and allows overrides", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner, participant } = await fixtures(suffix);
    const otherArea = await prisma.area.create({
      data: {
        name: `T13 Área alt ${suffix}`,
        nameNormalized: normalizeCatalogName(`T13 Área alt ${suffix}`),
      },
    });
    areaIds.push(otherArea.id);
    const otherOwner = await prisma.user.create({
      data: {
        oidcIssuer: `https://t13.test/${suffix}-alt`,
        oidcSubject: `alt-owner-${suffix}`,
        displayName: `Alt owner ${suffix}`,
        isActive: true,
      },
    });
    userIds.push(otherOwner.id);

    const project = await createProject(
      actor,
      projectInput(area.id, owner.id, `T13 Herança ${suffix}`, {
        participantIds: [participant.id],
        nature: Nature.OPERATIONAL,
        architectureRole: ArchitectureRole.CONTRIBUTOR,
      }),
      deps(),
    );
    projectIds.push(project.id);

    const defaults = await getProjectDefaults(actor, project.id, deps().projects);
    expect(defaults).toMatchObject({
      projectId: project.id,
      ownerId: owner.id,
      participantIds: [participant.id],
      nature: Nature.OPERATIONAL,
      architectureRole: ArchitectureRole.CONTRIBUTOR,
      requestingAreaId: area.id,
    });

    const inherited = await createActivity(
      actor,
      {
        title: `T13 Herdada ${suffix}`,
        description: null,
        observations: null,
        type: ActivityType.PROJECT,
        projectId: project.id,
        domainId: domain.id,
        requestingAreaId: undefined,
        nature: undefined,
        architectureRole: undefined,
        ownerId: undefined,
        participantIds: undefined,
        priority: Priority.HIGH,
        effort: null,
        status: ActivityStatus.TODO,
        startDate: null,
        expectedEndDate: null,
        completedDate: null,
        involvedAreaIds: [],
      },
      deps(),
    );
    activityIds.push(inherited.id);

    expect(inherited.owner.id).toBe(owner.id);
    expect(inherited.participants.map((item) => item.id)).toEqual([participant.id]);
    expect(inherited.nature).toBe(Nature.OPERATIONAL);
    expect(inherited.architectureRole).toBe(ArchitectureRole.CONTRIBUTOR);
    expect(inherited.requestingArea.id).toBe(area.id);
    expect(inherited.priority).toBe(Priority.HIGH);

    const overridden = await createActivity(
      actor,
      {
        title: `T13 Override ${suffix}`,
        description: null,
        observations: null,
        type: ActivityType.PROJECT,
        projectId: project.id,
        domainId: domain.id,
        ownerId: otherOwner.id,
        participantIds: [],
        requestingAreaId: otherArea.id,
        nature: Nature.STRATEGIC,
        architectureRole: ArchitectureRole.RESPONSIBLE,
        priority: Priority.LOW,
        effort: null,
        status: ActivityStatus.BACKLOG,
        startDate: null,
        expectedEndDate: null,
        completedDate: null,
        involvedAreaIds: [],
      },
      deps(),
    );
    activityIds.push(overridden.id);

    expect(overridden.owner.id).toBe(otherOwner.id);
    expect(overridden.participants).toEqual([]);
    expect(overridden.nature).toBe(Nature.STRATEGIC);
    expect(overridden.architectureRole).toBe(ArchitectureRole.RESPONSIBLE);
    expect(overridden.requestingArea.id).toBe(otherArea.id);
  });

  it("requires exactly one owner and does not treat participants as the owner", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner, participant } = await fixtures(suffix);

    await expect(
      createActivity(
        actor,
        adHocInput(area.id, domain.id, owner.id, `T13 Sem dono ${suffix}`, {
          ownerId: undefined,
          participantIds: [participant.id],
        }),
        deps(),
      ),
    ).rejects.toBeInstanceOf(ValidationError);

    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T13 Um dono ${suffix}`, {
        participantIds: [participant.id],
      }),
      deps(),
    );
    activityIds.push(created.id);
    expect(created.owner.id).toBe(owner.id);
    expect(created.participants.map((item) => item.id)).toEqual([participant.id]);
    expect(created.participants.map((item) => item.id)).not.toContain(created.owner.id);
  });

  it("writes an audit snapshot with portrait dimensions on create", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T13 Auditoria ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    const events = await prisma.auditEvent.findMany({ where: { entityId: created.id } });
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe(AuditAction.created);
    expect(events[0]?.entityKind).toBe(AuditEntityKind.Activity);
    expect(events[0]?.activityId).toBe(created.id);
    const changes = events[0]?.changes as {
      snapshot?: Record<string, unknown>;
      fields?: Record<string, unknown>;
    };
    expect(changes.snapshot?.tipo).toBe("AD_HOC");
    expect(changes.snapshot?.status).toBe("BACKLOG");
    expect(changes.snapshot?.responsavelId).toBe(owner.id);
    expect(new Set(Object.keys(changes.snapshot ?? {}))).toEqual(new Set(ACTIVITY_PORTRAIT_FIELDS));
    expect(new Set(Object.keys(changes.fields ?? {}))).toEqual(new Set(ACTIVITY_PORTRAIT_FIELDS));
  });

  it("rejects a stale version without overwriting", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T13 Conflito ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    const firstEdit = await updateActivity(
      actor,
      {
        id: created.id,
        version: created.version,
        title: `T13 Conflito v2 ${suffix}`,
        description: created.description,
        observations: created.observations,
        type: created.type,
        projectId: null,
        requestingAreaId: created.requestingArea.id,
        domainId: created.domain.id,
        nature: created.nature,
        architectureRole: created.architectureRole,
        ownerId: created.owner.id,
        participantIds: [],
        involvedAreaIds: [],
        priority: created.priority,
        effort: created.effort,
        status: ActivityStatus.BACKLOG,
        startDate: created.startDate,
        expectedEndDate: created.expectedEndDate,
        completedDate: created.completedDate,
      },
      deps(),
    );
    expect(firstEdit.version).toBe(created.version + 1);

    await expect(
      updateActivity(
        actor,
        {
          id: created.id,
          version: created.version,
          title: "não deve persistir",
          description: null,
          observations: null,
          type: ActivityType.AD_HOC,
          projectId: null,
          requestingAreaId: area.id,
          domainId: domain.id,
          nature: Nature.OPERATIONAL,
          architectureRole: ArchitectureRole.CONTRIBUTOR,
          ownerId: owner.id,
          participantIds: [],
          involvedAreaIds: [],
          priority: Priority.LOW,
          effort: null,
          status: ActivityStatus.TODO,
          startDate: null,
          expectedEndDate: null,
          completedDate: null,
        },
        deps(),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    const persisted = await prisma.activity.findUnique({ where: { id: created.id } });
    expect(persisted?.title).toBe(`T13 Conflito v2 ${suffix}`);
    expect(persisted?.version).toBe(firstEdit.version);
  });

  it("fills start date when creating already in progress and not when creating done", async ({
    skip,
  }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const today = instantToCivilDate(new Date(), "America/Sao_Paulo");

    const inProgress = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T13 Em andamento ${suffix}`, {
        status: ActivityStatus.IN_PROGRESS,
      }),
      deps(),
    );
    activityIds.push(inProgress.id);
    expect(inProgress.startDate).toBe(today);

    const done = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T13 Concluída ${suffix}`, {
        status: ActivityStatus.DONE,
      }),
      deps(),
    );
    activityIds.push(done.id);
    expect(done.startDate).toBeNull();
  });

  it("does not allow editing a cancelled activity", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T13 Terminal ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    await prisma.activity.update({
      where: { id: created.id },
      data: { status: "CANCELLED" },
    });

    await expect(
      updateActivity(
        actor,
        {
          id: created.id,
          version: created.version,
          title: created.title,
          description: "tentativa",
          observations: null,
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
          effort: null,
          status: ActivityStatus.BACKLOG,
          startDate: null,
          expectedEndDate: null,
          completedDate: null,
        },
        deps(),
      ),
    ).rejects.toBeInstanceOf(InvariantError);

    const loaded = await getActivity(actor, created.id, deps().activities);
    expect(loaded?.status).toBe(ActivityStatus.CANCELLED);
    expect(loaded?.description).toBeNull();
  });

  it("lists kanban card fields and excludes cancelled by default", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const project = await createProject(
      actor,
      projectInput(area.id, owner.id, `T17 Projeto ${suffix}`),
      deps(),
    );
    projectIds.push(project.id);

    const open = await createActivity(
      actor,
      {
        ...adHocInput(area.id, domain.id, owner.id, `T17 Card ${suffix}`),
        type: ActivityType.PROJECT,
        projectId: project.id,
        effort: Effort.M,
        architectureRole: ArchitectureRole.CONTRIBUTOR,
        expectedEndDate: "2026-09-30",
      },
      deps(),
    );
    activityIds.push(open.id);

    await prisma.activityTask.createMany({
      data: [
        { activityId: open.id, description: "Tarefa feita", isDone: true, sortOrder: 0 },
        { activityId: open.id, description: "Tarefa aberta", isDone: false, sortOrder: 1 },
      ],
    });

    const cancelled = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T17 Cancelada ${suffix}`),
      deps(),
    );
    activityIds.push(cancelled.id);
    await prisma.activity.update({
      where: { id: cancelled.id },
      data: { status: "CANCELLED" },
    });

    const board = await listActivities(actor, { includeCancelled: false }, deps().activities);
    const card = board.find((item) => item.id === open.id);
    expect(card?.effort).toBe(Effort.M);
    expect(card?.architectureRole).toBe(ArchitectureRole.CONTRIBUTOR);
    expect(card?.expectedEndDate).toBe("2026-09-30");
    expect(card?.checklistDoneCount).toBe(1);
    expect(card?.checklistTotalCount).toBe(2);
    expect(card?.project?.name).toBe(`T17 Projeto ${suffix}`);
    expect(board.map((item) => item.id)).not.toContain(cancelled.id);

    const withCancelled = await listActivities(actor, { includeCancelled: true }, deps().activities);
    expect(withCancelled.map((item) => item.id)).toContain(cancelled.id);

    const projectList = await listActivities(
      actor,
      { projectId: project.id, includeCancelled: true },
      deps().activities,
    );
    expect(projectList.find((item) => item.id === open.id)?.checklistTotalCount).toBe(2);
    expect(projectList.find((item) => item.id === open.id)?.effort).toBe(Effort.M);
  });
});
