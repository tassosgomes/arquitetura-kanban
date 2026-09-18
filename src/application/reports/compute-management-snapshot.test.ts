import { describe, expect, it, vi } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import type { LocalUser } from "@/domain/identity/local-user";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AuditRepository } from "@/application/ports/audit-repository";
import type { AreaRepository, CatalogUserRepository, DomainRepository } from "@/application/ports/catalog-repositories";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ActivityListItem } from "@/application/activities/types";
import {
  buildActivityCreatedChanges,
  buildActivityUpdatedChanges,
  emptyActivityPortrait,
} from "@/application/audit";
import type { AuditEventRecord } from "@/application/ports/audit-repository";
import { AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { computeManagementSnapshot } from "@/application/reports";
import { PeriodPreset, TemporalQueryMode } from "@/application/temporal";

const actor: LocalUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  oidcIssuer: "https://t25.test",
  oidcSubject: "actor",
  isActive: true,
};

const ana = "11111111-1111-4111-8111-111111111111";
const carlos = "22222222-2222-4222-8222-222222222222";

function listItem(
  overrides: Partial<ActivityListItem> & Pick<ActivityListItem, "id" | "status">,
): ActivityListItem {
  return {
    title: overrides.id,
    description: null,
    type: ActivityType.AD_HOC,
    priority: Priority.MEDIUM,
    effort: null,
    architectureRole: ArchitectureRole.RESPONSIBLE,
    startDate: null,
    expectedEndDate: null,
    completedDate: null,
    cancelledDate: null,
    checklistDoneCount: 0,
    checklistTotalCount: 0,
    project: null,
    requestingArea: { id: "area", name: "Financeiro", isActive: true },
    owner: { id: ana, displayName: "Ana", email: null, isActive: true },
    updatedAt: new Date("2026-09-10T12:00:00.000Z"),
    version: 1,
    ...overrides,
  };
}

function auditRecord(
  activityId: string,
  at: string,
  sequence: bigint,
  changes: AuditEventRecord["changes"],
): AuditEventRecord {
  return {
    id: `evt-${sequence.toString()}`,
    sequence,
    occurredAt: new Date(at),
    actorUserId: actor.id,
    entityKind: AuditEntityKind.Activity,
    entityId: activityId,
    action: "status_changed",
    activityId,
    changes,
  };
}

function emptyRepos(list: ActivityListItem[], events: AuditEventRecord[]) {
  const activities = {
    list: vi.fn(async () => list),
  } as unknown as ActivityRepository;

  const audit: AuditRepository = {
    listForActivity: vi.fn(async () => ({ events: [], hasMore: false })),
    listForProject: vi.fn(async () => ({ events: [], hasMore: false })),
    listForActivities: vi.fn(async ({ activityIds, beforeOccurredAt }) =>
      events.filter((event) => {
        if (!event.activityId || !activityIds.includes(event.activityId)) {
          return false;
        }
        if (beforeOccurredAt && !(event.occurredAt.getTime() < beforeOccurredAt.getTime())) {
          return false;
        }
        return true;
      }),
    ),
  };

  const users = {
    listAll: vi.fn(async () => [
      { id: ana, displayName: "Ana", email: null, isActive: true },
      { id: carlos, displayName: "Carlos", email: null, isActive: true },
    ]),
  } as unknown as CatalogUserRepository;

  const areas = { list: vi.fn(async () => []) } as unknown as AreaRepository;
  const domains = { list: vi.fn(async () => []) } as unknown as DomainRepository;
  const projects = { list: vi.fn(async () => []) } as unknown as ProjectRepository;

  return { activities, audit, users, areas, domains, projects };
}

const basePortrait = emptyActivityPortrait({
  status: ActivityStatus.IN_PROGRESS,
  responsavelId: ana,
  tipo: ActivityType.AD_HOC,
  natureza: Nature.OPERATIONAL,
  papelArquitetura: ArchitectureRole.RESPONSIBLE,
  prioridade: Priority.MEDIUM,
  dominioId: "d-arq",
  areaSolicitanteId: "ar-fin",
});

describe("computeManagementSnapshot (query wiring)", () => {
  it("uses T19 current dates for P and portrait status at closing (FX-01)", async () => {
    const id = "a-ago-set";
    const listed = [
      listItem({
        id,
        status: ActivityStatus.DONE,
        startDate: "2026-08-25",
        completedDate: "2026-09-18",
      }),
    ];
    const events = [
      auditRecord(id, "2026-08-20T10:00:00-03:00", 1n, buildActivityCreatedChanges({
        ...basePortrait,
        status: ActivityStatus.BACKLOG,
      })),
      auditRecord(id, "2026-08-25T09:00:00-03:00", 2n, buildActivityUpdatedChanges(
        { ...basePortrait, status: ActivityStatus.BACKLOG },
        { ...basePortrait, status: ActivityStatus.IN_PROGRESS, dataInicio: "2026-08-25" },
      )),
      auditRecord(id, "2026-09-18T16:00:00-03:00", 3n, buildActivityUpdatedChanges(
        { ...basePortrait, status: ActivityStatus.IN_PROGRESS, dataInicio: "2026-08-25" },
        {
          ...basePortrait,
          status: ActivityStatus.DONE,
          dataInicio: "2026-08-25",
          dataConclusao: "2026-09-18",
        },
      )),
    ];
    const deps = emptyRepos(listed, events);
    const clock = { now: () => new Date("2026-09-20T12:00:00-03:00") };

    const agosto = await computeManagementSnapshot(
      actor,
      {
        temporal: {
          mode: TemporalQueryMode.PERIOD,
          period: { from: "2026-08-01", to: "2026-08-31" },
        },
      },
      { ...deps, clock },
    );
    expect(agosto.indicators["I-01"]).toBe(1);
    expect(agosto.indicators["I-02"]).toBe(0);
    expect(agosto.indicators["I-05"]).toBe(1);
    expect(agosto.populationIds).toEqual([id]);

    const setembro = await computeManagementSnapshot(
      actor,
      {
        temporal: {
          mode: TemporalQueryMode.PERIOD,
          period: { from: "2026-09-01", to: "2026-09-30" },
        },
      },
      { ...deps, clock },
    );
    expect(setembro.indicators["I-01"]).toBe(1);
    expect(setembro.indicators["I-02"]).toBe(1);
    expect(setembro.indicators["I-05"]).toBe(0);

    const outubro = await computeManagementSnapshot(
      actor,
      {
        temporal: {
          mode: TemporalQueryMode.PERIOD,
          period: { from: "2026-10-01", to: "2026-10-31" },
        },
      },
      { ...deps, clock },
    );
    expect(outubro.indicators["I-01"]).toBe(0);
    expect(deps.audit.listForActivities).toHaveBeenCalled();
  });

  it("applies historical owner filters on the portrait, not the current owner (FX-09)", async () => {
    const id = "a-troca-resp";
    const listed = [
      listItem({
        id,
        status: ActivityStatus.IN_PROGRESS,
        startDate: "2026-08-10",
        owner: { id: carlos, displayName: "Carlos", email: null, isActive: true },
      }),
    ];
    const events = [
      auditRecord(id, "2026-08-10T09:00:00-03:00", 1n, buildActivityCreatedChanges({
        ...basePortrait,
        status: ActivityStatus.IN_PROGRESS,
        responsavelId: ana,
        dataInicio: "2026-08-10",
      })),
      auditRecord(id, "2026-09-05T09:00:00-03:00", 2n, buildActivityUpdatedChanges(
        { ...basePortrait, status: ActivityStatus.IN_PROGRESS, responsavelId: ana, dataInicio: "2026-08-10" },
        { ...basePortrait, status: ActivityStatus.IN_PROGRESS, responsavelId: carlos, dataInicio: "2026-08-10" },
      )),
    ];
    const deps = emptyRepos(listed, events);
    const clock = { now: () => new Date("2026-09-10T15:00:00-03:00") };

    const agostoAna = await computeManagementSnapshot(
      actor,
      {
        temporal: {
          mode: TemporalQueryMode.PERIOD,
          period: { from: "2026-08-01", to: "2026-08-31" },
        },
        filters: { ownerId: ana },
      },
      { ...deps, clock },
    );
    expect(agostoAna.populationIds).toEqual([id]);
    expect(agostoAna.distributions["D-RESPONSAVEL"].map((bucket) => bucket.key)).toEqual([ana]);

    const agostoCarlos = await computeManagementSnapshot(
      actor,
      {
        temporal: {
          mode: TemporalQueryMode.PERIOD,
          period: { from: "2026-08-01", to: "2026-08-31" },
        },
        filters: { ownerId: carlos },
      },
      { ...deps, clock },
    );
    expect(agostoCarlos.populationIds).toEqual([]);

    const esteMesCarlos = await computeManagementSnapshot(
      actor,
      {
        temporal: { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH },
        filters: { ownerId: carlos },
      },
      { ...deps, clock },
    );
    expect(esteMesCarlos.populationIds).toEqual([id]);
  });

  it("counts a retroactive date correction in I-01 without status/D-* (FX-08 / DE-05)", async () => {
    const id = "a-corrigida";
    const listed = [
      listItem({
        id,
        status: ActivityStatus.DONE,
        startDate: "2026-08-25",
        completedDate: "2026-09-05",
      }),
    ];
    const events = [
      auditRecord(id, "2026-09-01T09:00:00-03:00", 1n, buildActivityCreatedChanges({
        ...basePortrait,
        status: ActivityStatus.IN_PROGRESS,
        dataInicio: "2026-09-01",
      })),
      auditRecord(id, "2026-09-05T17:00:00-03:00", 2n, buildActivityUpdatedChanges(
        { ...basePortrait, status: ActivityStatus.IN_PROGRESS, dataInicio: "2026-09-01" },
        {
          ...basePortrait,
          status: ActivityStatus.DONE,
          dataInicio: "2026-09-01",
          dataConclusao: "2026-09-05",
        },
      )),
      auditRecord(id, "2026-09-10T11:00:00-03:00", 3n, buildActivityUpdatedChanges(
        {
          ...basePortrait,
          status: ActivityStatus.DONE,
          dataInicio: "2026-09-01",
          dataConclusao: "2026-09-05",
        },
        {
          ...basePortrait,
          status: ActivityStatus.DONE,
          dataInicio: "2026-08-25",
          dataConclusao: "2026-09-05",
        },
      )),
    ];
    const deps = emptyRepos(listed, events);
    const clock = { now: () => new Date("2026-09-10T15:00:00-03:00") };

    const agosto = await computeManagementSnapshot(
      actor,
      {
        temporal: {
          mode: TemporalQueryMode.PERIOD,
          period: { from: "2026-08-01", to: "2026-08-31" },
        },
      },
      { ...deps, clock },
    );
    expect(agosto.indicators["I-01"]).toBe(1);
    expect(agosto.indicators["I-02"]).toBe(0);
    expect(agosto.indicators["I-05"]).toBe(0);
    expect(agosto.distributions["D-RESPONSAVEL"]).toEqual([]);
    expect(agosto.distributions["D-AREA"]).toEqual([]);
  });
});
