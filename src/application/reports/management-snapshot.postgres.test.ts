import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";
import { ProjectStatus } from "@/domain/project/project-status";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import type { Clock } from "@/application/ports/clock";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { ActivityRecord } from "@/application/activities/types";
import type { CreateActivityInput, UpdateActivityInput } from "@/application/activities/schemas";
import {
  changeActivityStatus,
  createActivity,
  updateActivity,
} from "@/application/activities";
import { createProject } from "@/application/projects";
import { computeManagementSnapshot } from "@/application/reports";
import { PeriodPreset, TemporalQueryMode } from "@/application/temporal";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaAuditRepository } from "@/infrastructure/db/repositories/prisma-audit-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";

const DEFAULT_NOW = "2026-09-10T15:00:00-03:00";

function clockAt(iso: string): Clock {
  return { now: () => new Date(iso) };
}

function ago() {
  return {
    temporal: {
      mode: TemporalQueryMode.PERIOD,
      period: { from: "2026-08-01", to: "2026-08-31" },
    },
  };
}

function setembro() {
  return {
    temporal: {
      mode: TemporalQueryMode.PERIOD,
      period: { from: "2026-09-01", to: "2026-09-30" },
    },
  };
}

function esteMes() {
  return {
    temporal: { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH },
  };
}

function bucketCounts(buckets: { key: string; count: number }[]): Record<string, number> {
  return Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket.count]));
}

function scopeActivities(inner: ActivityRepository, ids: readonly string[]): ActivityRepository {
  const allowed = new Set(ids);
  return {
    ...inner,
    async list(filter) {
      const rows = await inner.list(filter);
      return rows.filter((row) => allowed.has(row.id));
    },
  };
}

describe("computeManagementSnapshot postgres fixtures (T25)", () => {
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
        oidcIssuer: `https://t25.test/${randomUUID()}`,
        oidcSubject: "t25-actor",
        displayName: "T25 actor",
        email: "t25.actor@example.com",
        isActive: true,
      },
    });
    userIds.push(user.id);
    actor = {
      id: user.id,
      oidcIssuer: user.oidcIssuer,
      oidcSubject: user.oidcSubject,
      displayName: user.displayName ?? undefined,
      email: user.email ?? undefined,
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

  function baseDeps() {
    if (!prisma || !actor) {
      throw new Error("postgres unavailable");
    }
    return {
      activities: createPrismaActivityRepository(prisma),
      projects: createPrismaProjectRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      domains: createPrismaDomainRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      audit: createPrismaAuditRepository(prisma),
      prisma,
      actor,
    };
  }

  function commandDeps(clock: Clock) {
    return { ...baseDeps(), clock };
  }

  async function snapshotFor(
    ids: readonly string[],
    query: Parameters<typeof computeManagementSnapshot>[1],
    nowIso: string = DEFAULT_NOW,
  ) {
    const deps = baseDeps();
    return computeManagementSnapshot(deps.actor, query, {
      ...deps,
      activities: scopeActivities(deps.activities, ids),
      clock: clockAt(nowIso),
    });
  }

  async function createArea(name: string) {
    if (!prisma) {
      throw new Error("postgres unavailable");
    }
    const area = await prisma.area.create({
      data: { name, nameNormalized: normalizeCatalogName(name) },
    });
    areaIds.push(area.id);
    return area;
  }

  async function createUser(suffix: string, displayName: string) {
    if (!prisma) {
      throw new Error("postgres unavailable");
    }
    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t25.test/${randomUUID()}`,
        oidcSubject: `user-${suffix}`,
        displayName,
        email: `${suffix}@t25.example`,
        isActive: true,
      },
    });
    userIds.push(user.id);
    return user;
  }

  async function catalogs(suffix: string) {
    const [fin, ti, rh, ops, domain, ana, carlos] = await Promise.all([
      createArea(`T25 Fin ${suffix}`),
      createArea(`T25 TI ${suffix}`),
      createArea(`T25 RH ${suffix}`),
      createArea(`T25 Ops ${suffix}`),
      prisma!.architectureDomain.create({
        data: {
          name: `T25 Domínio ${suffix}`,
          nameNormalized: normalizeCatalogName(`T25 Domínio ${suffix}`),
        },
      }),
      createUser(`${suffix}-ana`, "Ana"),
      createUser(`${suffix}-carlos`, "Carlos"),
    ]);
    domainIds.push(domain.id);
    return { fin, ti, rh, ops, domain, ana, carlos };
  }

  async function addProject(
    catalog: Awaited<ReturnType<typeof catalogs>>,
    name: string,
  ) {
    const { actor: current } = baseDeps();
    const project = await createProject(
      current,
      {
        name,
        description: null,
        responsibleAreaId: catalog.fin.id,
        externalResponsible: null,
        architectureOwnerId: catalog.ana.id,
        participantIds: [],
        architectureRole: ArchitectureRole.RESPONSIBLE,
        nature: Nature.STRATEGIC,
        startDate: "2026-01-01",
        expectedEndDate: null,
        status: ProjectStatus.IN_PROGRESS,
      },
      commandDeps(clockAt(DEFAULT_NOW)),
    );
    projectIds.push(project.id);
    return project;
  }

  function adHocInput(
    catalog: Awaited<ReturnType<typeof catalogs>>,
    title: string,
    overrides: Partial<CreateActivityInput> = {},
  ): CreateActivityInput {
    return {
      title,
      description: null,
      observations: null,
      type: ActivityType.AD_HOC,
      projectId: null,
      requestingAreaId: catalog.fin.id,
      domainId: catalog.domain.id,
      nature: Nature.OPERATIONAL,
      architectureRole: ArchitectureRole.RESPONSIBLE,
      ownerId: catalog.ana.id,
      participantIds: [],
      involvedAreaIds: [],
      priority: Priority.MEDIUM,
      effort: Effort.M,
      status: ActivityStatus.IN_PROGRESS,
      startDate: "2026-08-10",
      expectedEndDate: null,
      completedDate: null,
      ...overrides,
    };
  }

  async function insertActivity(input: CreateActivityInput, at: string) {
    const { actor: current } = baseDeps();
    const created = await createActivity(current, input, commandDeps(clockAt(at)));
    activityIds.push(created.id);
    return created;
  }

  async function transition(activity: ActivityRecord, status: ActivityStatus | undefined, at: string) {
    const { actor: current } = baseDeps();
    return changeActivityStatus(
      current,
      { id: activity.id, version: activity.version, status },
      commandDeps(clockAt(at)),
    );
  }

  function toUpdateInput(
    activity: ActivityRecord,
    overrides: Partial<UpdateActivityInput> = {},
  ): UpdateActivityInput {
    return {
      id: activity.id,
      version: activity.version,
      title: activity.title,
      description: activity.description,
      observations: activity.observations,
      type: activity.type,
      projectId: activity.project?.id ?? null,
      requestingAreaId: activity.requestingArea.id,
      domainId: activity.domain.id,
      nature: activity.nature,
      architectureRole: activity.architectureRole,
      ownerId: activity.owner.id,
      participantIds: activity.participants.map((participant) => participant.id),
      involvedAreaIds: activity.involvedAreas.map((area) => area.id),
      priority: activity.priority,
      effort: activity.effort,
      status: activity.status as UpdateActivityInput["status"],
      startDate: activity.startDate,
      expectedEndDate: activity.expectedEndDate,
      completedDate: activity.completedDate,
      ...overrides,
    };
  }

  async function edit(activity: ActivityRecord, overrides: Partial<UpdateActivityInput>, at: string) {
    const { actor: current } = baseDeps();
    return updateActivity(current, toUpdateInput(activity, overrides), commandDeps(clockAt(at)));
  }

  it("FX-01 retrato agosto Em andamento / setembro Concluído", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const catalog = await catalogs(suffix);
    let activity = await insertActivity(
      adHocInput(catalog, `T25 FX-01 ${suffix}`, {
        status: ActivityStatus.BACKLOG,
        startDate: null,
      }),
      "2026-08-20T10:00:00-03:00",
    );
    activity = await transition(activity, ActivityStatus.IN_PROGRESS, "2026-08-25T09:00:00-03:00");
    activity = await transition(activity, ActivityStatus.DONE, "2026-09-18T16:00:00-03:00");
    expect(activity.startDate).toBe("2026-08-25");
    expect(activity.completedDate).toBe("2026-09-18");

    const now = "2026-09-20T12:00:00-03:00";
    const ids = [activity.id];
    const agostoSnap = await snapshotFor(ids, ago(), now);
    expect(agostoSnap.indicators).toMatchObject({ "I-01": 1, "I-02": 0, "I-05": 1, "I-09": 0 });

    const setembroSnap = await snapshotFor(ids, setembro(), now);
    expect(setembroSnap.indicators).toMatchObject({ "I-01": 1, "I-02": 1, "I-05": 0 });
  });

  it("FX-05 reabertura: agosto concluída, setembro em andamento, uma vez em P", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const catalog = await catalogs(suffix);
    let activity = await insertActivity(
      adHocInput(catalog, `T25 FX-05 ${suffix}`, {
        requestingAreaId: catalog.ops.id,
        startDate: "2026-08-01",
      }),
      "2026-08-01T09:00:00-03:00",
    );
    activity = await transition(activity, ActivityStatus.DONE, "2026-08-20T18:00:00-03:00");
    activity = await transition(activity, undefined, "2026-09-05T10:00:00-03:00");
    expect(activity.status).toBe(ActivityStatus.IN_PROGRESS);
    expect(activity.startDate).toBe("2026-08-01");
    expect(activity.completedDate).toBeNull();

    const ids = [activity.id];
    const agostoSnap = await snapshotFor(ids, ago());
    expect(agostoSnap.indicators).toMatchObject({ "I-01": 1, "I-02": 1, "I-05": 0 });
    expect(agostoSnap.populationIds).toEqual(ids);

    const setembroSnap = await snapshotFor(ids, esteMes());
    expect(setembroSnap.indicators).toMatchObject({ "I-01": 1, "I-02": 0, "I-05": 1 });
    expect(setembroSnap.populationIds).toEqual(ids);
  });

  it("FX-08 correção retroativa: I-01 de agosto sem status/D-* (DE-05)", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const catalog = await catalogs(suffix);
    let activity = await insertActivity(
      adHocInput(catalog, `T25 FX-08 ${suffix}`, { startDate: "2026-09-01" }),
      "2026-09-01T09:00:00-03:00",
    );
    activity = await transition(activity, ActivityStatus.DONE, "2026-09-05T17:00:00-03:00");
    activity = await edit(
      activity,
      { startDate: "2026-08-25", completedDate: "2026-09-05", status: ActivityStatus.DONE },
      "2026-09-10T11:00:00-03:00",
    );
    expect(activity.startDate).toBe("2026-08-25");

    const ids = [activity.id];
    const agostoSnap = await snapshotFor(ids, ago());
    expect(agostoSnap.indicators).toMatchObject({ "I-01": 1, "I-02": 0, "I-05": 0 });
    expect(agostoSnap.distributions["D-AREA"]).toEqual([]);
    expect(agostoSnap.distributions["D-RESPONSAVEL"]).toEqual([]);

    const setembroSnap = await snapshotFor(ids, esteMes());
    expect(setembroSnap.indicators).toMatchObject({ "I-01": 1, "I-02": 1, "I-05": 0 });
  });

  it("FX-09/b/c dimensões históricas e filtro de responsável no retrato", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const catalog = await catalogs(suffix);
    const erp = await addProject(catalog, `T25 ERP ${suffix}`);
    const data = await addProject(catalog, `T25 Data ${suffix}`);

    let ownerSwap = await insertActivity(
      adHocInput(catalog, `T25 FX-09 ${suffix}`, { startDate: "2026-08-10" }),
      "2026-08-10T09:00:00-03:00",
    );
    ownerSwap = await edit(ownerSwap, { ownerId: catalog.carlos.id }, "2026-09-05T09:00:00-03:00");

    let areaSwap = await insertActivity(
      adHocInput(catalog, `T25 FX-09b ${suffix}`, {
        startDate: "2026-08-10",
        requestingAreaId: catalog.fin.id,
      }),
      "2026-08-10T09:00:00-03:00",
    );
    areaSwap = await edit(
      areaSwap,
      { requestingAreaId: catalog.rh.id },
      "2026-09-06T09:00:00-03:00",
    );

    let projectSwap = await insertActivity(
      adHocInput(catalog, `T25 FX-09c ${suffix}`, {
        type: ActivityType.PROJECT,
        projectId: erp.id,
        startDate: "2026-08-10",
      }),
      "2026-08-10T09:00:00-03:00",
    );
    projectSwap = await edit(
      projectSwap,
      { type: ActivityType.PROJECT, projectId: data.id },
      "2026-09-08T09:00:00-03:00",
    );

    const ownerIds = [ownerSwap.id];
    const agostoAna = await snapshotFor(ownerIds, { ...ago(), filters: { ownerId: catalog.ana.id } });
    const agostoCarlos = await snapshotFor(ownerIds, {
      ...ago(),
      filters: { ownerId: catalog.carlos.id },
    });
    expect(agostoAna.populationIds).toEqual(ownerIds);
    expect(agostoCarlos.populationIds).toEqual([]);
    expect(bucketCounts((await snapshotFor(ownerIds, ago())).distributions["D-RESPONSAVEL"])).toEqual({
      [catalog.ana.id]: 1,
    });

    const esteMesOwner = await snapshotFor(ownerIds, {
      ...esteMes(),
      filters: { ownerId: catalog.carlos.id },
    });
    expect(esteMesOwner.populationIds).toEqual(ownerIds);

    const areaAgo = await snapshotFor([areaSwap.id], ago());
    const areaMes = await snapshotFor([areaSwap.id], esteMes());
    expect(areaAgo.indicators["I-04"]).toBe(1);
    expect(bucketCounts(areaAgo.distributions["D-AREA"])).toEqual({ [catalog.fin.id]: 1 });
    expect(bucketCounts(areaMes.distributions["D-AREA"])).toEqual({ [catalog.rh.id]: 1 });

    const projectAgo = await snapshotFor([projectSwap.id], ago());
    const projectMes = await snapshotFor([projectSwap.id], esteMes());
    expect(projectAgo.indicators["I-03"]).toBe(1);
    expect(projectMes.indicators["I-03"]).toBe(1);
    expect(projectAgo.distributions["D-TIPO"][0]?.key).toBe(ActivityType.PROJECT);
  });

  it("FX-10/10b D-AREA soma > I-01 e solicitante repetida conta uma vez", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const catalog = await catalogs(suffix);
    const erp = await addProject(catalog, `T25 ERP-10 ${suffix}`);
    const data = await addProject(catalog, `T25 Data-10 ${suffix}`);

    const a1 = await insertActivity(
      adHocInput(catalog, `T25 FX-10 a1 ${suffix}`, {
        type: ActivityType.PROJECT,
        projectId: erp.id,
        requestingAreaId: catalog.fin.id,
        involvedAreaIds: [catalog.ti.id, catalog.rh.id],
        startDate: "2026-09-02",
        effort: Effort.M,
      }),
      "2026-09-02T09:00:00-03:00",
    );
    const a2 = await insertActivity(
      adHocInput(catalog, `T25 FX-10 a2 ${suffix}`, {
        type: ActivityType.PROJECT,
        projectId: data.id,
        requestingAreaId: catalog.ti.id,
        involvedAreaIds: [catalog.rh.id],
        startDate: "2026-09-03",
        effort: null,
      }),
      "2026-09-03T09:00:00-03:00",
    );

    const snap = await snapshotFor([a1.id, a2.id], esteMes());
    expect(snap.indicators).toMatchObject({
      "I-01": 2,
      "I-03": 2,
      "I-04": 3,
      "I-05": 2,
    });
    expect(bucketCounts(snap.distributions["D-AREA"])).toEqual({
      [catalog.fin.id]: 1,
      [catalog.ti.id]: 2,
      [catalog.rh.id]: 2,
    });
    const areaSum = snap.distributions["D-AREA"].reduce((sum, bucket) => sum + bucket.count, 0);
    expect(areaSum).toBe(5);
    expect(areaSum).toBeGreaterThan(snap.indicators["I-01"]);
    expect(snap.canonicalAreaNote).toContain("não é a soma por área");
    expect(bucketCounts(snap.distributions["D-ESFORCO"])).toEqual({
      [Effort.M]: 1,
      UNSET: 1,
    });

    const dup = await insertActivity(
      adHocInput(catalog, `T25 FX-10b ${suffix}`, {
        requestingAreaId: catalog.fin.id,
        involvedAreaIds: [catalog.fin.id, catalog.ti.id],
        startDate: "2026-09-01",
      }),
      "2026-09-01T09:00:00-03:00",
    );
    const dupSnap = await snapshotFor([dup.id], esteMes());
    expect(dupSnap.indicators).toMatchObject({ "I-01": 1, "I-04": 2 });
    expect(bucketCounts(dupSnap.distributions["D-AREA"])).toEqual({
      [catalog.fin.id]: 1,
      [catalog.ti.id]: 1,
    });
  });

  it("FX-11 esforço nulo vira Não informado", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const catalog = await catalogs(suffix);
    const ids: string[] = [];
    for (const [title, effort] of [
      ["p", Effort.P],
      ["m", Effort.M],
      ["g", Effort.G],
      ["nulo", null],
    ] as const) {
      const created = await insertActivity(
        adHocInput(catalog, `T25 FX-11 ${title} ${suffix}`, {
          startDate: "2026-09-01",
          effort,
        }),
        "2026-09-01T09:00:00-03:00",
      );
      ids.push(created.id);
    }

    const snap = await snapshotFor(ids, esteMes());
    expect(snap.indicators["I-01"]).toBe(4);
    expect(bucketCounts(snap.distributions["D-ESFORCO"])).toEqual({
      P: 1,
      M: 1,
      G: 1,
      UNSET: 1,
    });
    expect(snap.distributions["D-ESFORCO"].find((bucket) => bucket.key === "UNSET")?.label).toBe(
      "Não informado",
    );
  });

  it("FX-12 cancelados nos totais e FX-15 aguardando no retrato", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const catalog = await catalogs(suffix);
    const data = await addProject(catalog, `T25 Data-12 ${suffix}`);

    let done = await insertActivity(
      adHocInput(catalog, `T25 FX-12 conc ${suffix}`, {
        requestingAreaId: catalog.rh.id,
        ownerId: catalog.carlos.id,
        effort: Effort.G,
        startDate: "2026-08-02",
      }),
      "2026-08-02T09:00:00-03:00",
    );
    done = await transition(done, ActivityStatus.DONE, "2026-08-20T17:00:00-03:00");

    let cancelled = await insertActivity(
      adHocInput(catalog, `T25 FX-12 canc ${suffix}`, {
        type: ActivityType.PROJECT,
        projectId: data.id,
        requestingAreaId: catalog.ti.id,
        involvedAreaIds: [catalog.fin.id],
        ownerId: catalog.carlos.id,
        effort: Effort.P,
        startDate: "2026-08-10",
      }),
      "2026-08-10T09:00:00-03:00",
    );
    cancelled = await transition(cancelled, ActivityStatus.CANCELLED, "2026-08-20T14:00:00-03:00");

    const open = await insertActivity(
      adHocInput(catalog, `T25 FX-12 and ${suffix}`, { startDate: "2026-08-15" }),
      "2026-08-15T09:00:00-03:00",
    );

    let blocked = await insertActivity(
      adHocInput(catalog, `T25 FX-12 bloq ${suffix}`, { startDate: "2026-08-18" }),
      "2026-08-18T09:00:00-03:00",
    );
    blocked = await transition(blocked, ActivityStatus.BLOCKED, "2026-08-25T09:00:00-03:00");

    const later = await insertActivity(
      adHocInput(catalog, `T25 FX-12 fora ${suffix}`, { startDate: "2026-09-02" }),
      "2026-09-02T09:00:00-03:00",
    );

    const mixIds = [done.id, cancelled.id, open.id, blocked.id, later.id];
    const mix = await snapshotFor(mixIds, ago());
    expect(mix.indicators).toMatchObject({
      "I-01": 4,
      "I-02": 1,
      "I-05": 1,
      "I-06": 0,
      "I-07": 1,
      "I-09": 1,
    });
    expect(
      mix.indicators["I-02"] +
        mix.indicators["I-05"] +
        mix.indicators["I-06"] +
        mix.indicators["I-07"] +
        mix.indicators["I-09"],
    ).toBe(4);
    expect(mix.populationIds).not.toContain(later.id);

    let waiting = await insertActivity(
      adHocInput(catalog, `T25 FX-15 ${suffix}`, { startDate: "2026-08-20" }),
      "2026-08-20T09:00:00-03:00",
    );
    waiting = await transition(waiting, ActivityStatus.WAITING, "2026-08-28T09:00:00-03:00");
    waiting = await transition(waiting, ActivityStatus.IN_PROGRESS, "2026-09-03T09:00:00-03:00");

    const waitingAgo = await snapshotFor([waiting.id], ago());
    const waitingMes = await snapshotFor([waiting.id], esteMes());
    expect(waitingAgo.indicators).toMatchObject({ "I-05": 0, "I-06": 1 });
    expect(waitingMes.indicators).toMatchObject({ "I-05": 1, "I-06": 0 });
  });
});
