import { describe, expect, it, vi } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import type { LocalUser } from "@/domain/identity/local-user";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AuditRepository, AuditEventRecord } from "@/application/ports/audit-repository";
import type { AreaRepository, CatalogUserRepository, DomainRepository } from "@/application/ports/catalog-repositories";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ValueDeliveryRepository } from "@/application/ports/value-delivery-repository";
import type { ActivityListItem } from "@/application/activities/types";
import { buildActivityCreatedChanges, emptyActivityPortrait } from "@/application/audit";
import { AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { buildExecutiveBook } from "@/application/reports";
import { TemporalQueryMode } from "@/application/temporal";

const actor: LocalUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  oidcIssuer: "https://book.test",
  oidcSubject: "actor",
  isActive: true,
};

const FINANCE = "11111111-1111-4111-8111-111111111111";
const TECHNOLOGY = "22222222-2222-4222-8222-222222222222";
const PROJECT_FINANCE = "33333333-3333-4333-8333-333333333333";
const PROJECT_TECHNOLOGY = "44444444-4444-4444-8444-444444444444";

function activity(id: string, requestingAreaId: string, projectId: string): ActivityListItem {
  return {
    id,
    title: id,
    description: `Descrição de ${id}`,
    type: ActivityType.PROJECT,
    status: ActivityStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    effort: null,
    architectureRole: ArchitectureRole.RESPONSIBLE,
    startDate: "2026-09-05",
    expectedEndDate: "2026-09-20",
    completedDate: null,
    cancelledDate: null,
    checklistDoneCount: 1,
    checklistTotalCount: 2,
    project: { id: projectId, name: `Projeto ${id}`, status: "IN_PROGRESS" },
    requestingArea: { id: requestingAreaId, name: requestingAreaId, isActive: true },
    owner: { id: actor.id, displayName: "Ana", email: null, isActive: true },
    updatedAt: new Date("2026-09-10T12:00:00.000Z"),
    version: 1,
  };
}

function eventFor(
  activityId: string,
  sequence: bigint,
  portrait: ReturnType<typeof emptyActivityPortrait>,
): AuditEventRecord {
  return {
    id: `event-${sequence.toString()}`,
    sequence,
    occurredAt: new Date("2026-09-05T12:00:00-03:00"),
    actorUserId: actor.id,
    entityKind: AuditEntityKind.Activity,
    entityId: activityId,
    action: "created",
    activityId,
    changes: buildActivityCreatedChanges(portrait),
  };
}

function deps(list: ActivityListItem[], events: AuditEventRecord[]) {
  const activities = { list: vi.fn(async () => list) } as unknown as ActivityRepository;
  const audit: AuditRepository = {
    listForActivity: vi.fn(async () => ({ events: [], hasMore: false })),
    listForProject: vi.fn(async () => ({ events: [], hasMore: false })),
    listForActivities: vi.fn(async ({ activityIds, beforeOccurredAt }) =>
      events.filter(
        (event) =>
          event.activityId !== null &&
          activityIds.includes(event.activityId) &&
          (!beforeOccurredAt || event.occurredAt < beforeOccurredAt),
      ),
    ),
  };
  const users = {
    listAll: vi.fn(async () => [
      { id: actor.id, displayName: "Ana", email: null, isActive: true },
    ]),
  } as unknown as CatalogUserRepository;
  const areas = {
    list: vi.fn(async () => [
      { id: FINANCE, name: "Financeiro", isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: TECHNOLOGY, name: "Tecnologia", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]),
  } as unknown as AreaRepository;
  const domains = { list: vi.fn(async () => []) } as unknown as DomainRepository;
  const projects = {
    list: vi.fn(async () => [
      {
        id: PROJECT_FINANCE,
        name: "Projeto Financeiro",
        status: "IN_PROGRESS",
        responsibleArea: { id: FINANCE, name: "Financeiro", isActive: true },
        updatedAt: new Date(),
      },
      {
        id: PROJECT_TECHNOLOGY,
        name: "Projeto Tecnologia",
        status: "IN_PROGRESS",
        responsibleArea: { id: TECHNOLOGY, name: "Tecnologia", isActive: true },
        updatedAt: new Date(),
      },
    ]),
  } as unknown as ProjectRepository;
  const valueDeliveries: ValueDeliveryRepository = {
    findById: vi.fn(),
    listByProjectId: vi.fn(async () => []),
    listByProjectIds: vi.fn(async () => [
      {
        id: "delivery-1",
        projectId: PROJECT_FINANCE,
        title: "Entrega financeira",
        referenceDate: "2026-09-10",
        author: { id: actor.id, displayName: "Ana", email: null, isActive: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "delivery-2",
        projectId: PROJECT_TECHNOLOGY,
        title: "Entrega futura",
        referenceDate: "2026-10-10",
        author: { id: actor.id, displayName: "Ana", email: null, isActive: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    create: vi.fn(),
    update: vi.fn(),
  };
  return { activities, audit, users, areas, domains, projects, valueDeliveries };
}

describe("buildExecutiveBook", () => {
  it("groups by historical requesting area and keeps current details", async () => {
    const listed = [
      activity("activity-finance", FINANCE, PROJECT_FINANCE),
      activity("activity-technology", TECHNOLOGY, PROJECT_TECHNOLOGY),
    ];
    const events = [
      eventFor(
        "activity-finance",
        1n,
        emptyActivityPortrait({
          status: ActivityStatus.IN_PROGRESS,
          responsavelId: actor.id,
          tipo: ActivityType.PROJECT,
          natureza: Nature.STRATEGIC,
          papelArquitetura: ArchitectureRole.RESPONSIBLE,
          prioridade: Priority.HIGH,
          dominioId: "domain",
          areaSolicitanteId: FINANCE,
          projetoId: PROJECT_FINANCE,
          dataInicio: "2026-09-05",
          previsaoTermino: "2026-09-20",
        }),
      ),
      eventFor(
        "activity-technology",
        2n,
        emptyActivityPortrait({
          status: ActivityStatus.DONE,
          responsavelId: actor.id,
          tipo: ActivityType.PROJECT,
          natureza: Nature.OPERATIONAL,
          papelArquitetura: ArchitectureRole.RESPONSIBLE,
          prioridade: Priority.HIGH,
          dominioId: "domain",
          areaSolicitanteId: TECHNOLOGY,
          projetoId: PROJECT_TECHNOLOGY,
          dataInicio: "2026-09-05",
          dataConclusao: "2026-09-25",
          previsaoTermino: "2026-09-20",
        }),
      ),
    ];

    const result = await buildExecutiveBook(
      actor,
      {
        temporal: {
          mode: TemporalQueryMode.PERIOD,
          period: { from: "2026-09-01", to: "2026-09-30" },
        },
      },
      { ...deps(listed, events), clock: { now: () => new Date("2026-09-15T12:00:00-03:00") } },
    );

    expect(result.dataBase).toBe("2026-09-30");
    expect(result.geral.indicators["I-01"]).toBe(2);
    expect(result.areas.map((area) => area.name)).toEqual(["Financeiro", "Tecnologia"]);
    expect(result.areas[0]?.activities[0]?.description).toContain("activity-finance");
    expect(result.areas[0]?.deliveries.map((delivery) => delivery.title)).toEqual([
      "Entrega financeira",
    ]);
    expect(result.areas[1]?.deadlineSummary.byStatus.find((item) => item.status === "COMPLETED_LATE")?.count).toBe(1);
  });

  it("returns only the selected requester area when the filter is present", async () => {
    const listed = [activity("activity-finance", FINANCE, PROJECT_FINANCE), activity("activity-technology", TECHNOLOGY, PROJECT_TECHNOLOGY)];
    const events = [
      eventFor("activity-finance", 1n, emptyActivityPortrait({ status: ActivityStatus.IN_PROGRESS, tipo: ActivityType.PROJECT, areaSolicitanteId: FINANCE, projetoId: PROJECT_FINANCE, dataInicio: "2026-09-05" })),
      eventFor("activity-technology", 2n, emptyActivityPortrait({ status: ActivityStatus.IN_PROGRESS, tipo: ActivityType.PROJECT, areaSolicitanteId: TECHNOLOGY, projetoId: PROJECT_TECHNOLOGY, dataInicio: "2026-09-05" })),
    ];
    const result = await buildExecutiveBook(
      actor,
      {
        temporal: { mode: TemporalQueryMode.ALL },
        filters: { requestingAreaId: FINANCE },
      },
      { ...deps(listed, events), clock: { now: () => new Date("2026-09-15T12:00:00-03:00") } },
    );

    expect(result.areas.map((area) => area.id)).toEqual([FINANCE]);
    expect(result.areas[0]?.activities.map((activity) => activity.id)).toEqual(["activity-finance"]);
  });
});
