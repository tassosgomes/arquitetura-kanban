import { describe, expect, it, vi } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import type { LocalUser } from "@/domain/identity/local-user";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AuditRepository } from "@/application/ports/audit-repository";
import type { AreaRepository, CatalogUserRepository, DomainRepository } from "@/application/ports/catalog-repositories";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ActivityListItem } from "@/application/activities/types";
import { buildActivityCreatedChanges, emptyActivityPortrait } from "@/application/audit";
import type { AuditEventRecord } from "@/application/ports/audit-repository";
import { AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { buildManagementReport, computeManagementSnapshot } from "@/application/reports";
import { paginateItems } from "@/application/reports/pagination";
import { TemporalQueryMode } from "@/application/temporal";

const actor: LocalUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  oidcIssuer: "https://t27.test",
  oidcSubject: "actor",
  isActive: true,
};

const ana = "11111111-1111-4111-8111-111111111111";

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
    startDate: "2026-09-01",
    expectedEndDate: null,
    completedDate: null,
    cancelledDate: null,
    checklistDoneCount: 0,
    checklistTotalCount: 0,
    project: null,
    requestingArea: { id: "ar-fin", name: "Financeiro", isActive: true },
    owner: { id: ana, displayName: "Ana", email: null, isActive: true },
    updatedAt: new Date("2026-09-10T12:00:00.000Z"),
    version: 1,
    ...overrides,
  };
}

function auditRecord(activityId: string, sequence: bigint): AuditEventRecord {
  return {
    id: `evt-${sequence.toString()}`,
    sequence,
    occurredAt: new Date("2026-09-01T12:00:00-03:00"),
    actorUserId: actor.id,
    entityKind: AuditEntityKind.Activity,
    entityId: activityId,
    action: "created",
    activityId,
    changes: buildActivityCreatedChanges(
      emptyActivityPortrait({
        status: ActivityStatus.IN_PROGRESS,
        responsavelId: ana,
        tipo: ActivityType.AD_HOC,
        natureza: Nature.OPERATIONAL,
        papelArquitetura: ArchitectureRole.RESPONSIBLE,
        prioridade: Priority.MEDIUM,
        dominioId: "d-arq",
        areaSolicitanteId: "ar-fin",
        dataInicio: "2026-09-01",
      }),
    ),
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
    listAll: vi.fn(async () => [{ id: ana, displayName: "Ana", email: null, isActive: true }]),
  } as unknown as CatalogUserRepository;
  const areas = { list: vi.fn(async () => []) } as unknown as AreaRepository;
  const domains = { list: vi.fn(async () => []) } as unknown as DomainRepository;
  const projects = { list: vi.fn(async () => []) } as unknown as ProjectRepository;

  return { activities, audit, users, areas, domains, projects };
}

describe("buildManagementReport (T27)", () => {
  it("agrees with computeManagementSnapshot for the same filters", async () => {
    const listed = [
      listItem({ id: "a-1", status: ActivityStatus.IN_PROGRESS, title: "Uma" }),
      listItem({ id: "a-2", status: ActivityStatus.IN_PROGRESS, title: "Duas" }),
    ];
    const events = [auditRecord("a-1", 1n), auditRecord("a-2", 2n)];
    const deps = emptyRepos(listed, events);
    const clock = { now: () => new Date("2026-09-10T15:00:00-03:00") };
    const query = {
      temporal: {
        mode: TemporalQueryMode.PERIOD,
        period: { from: "2026-09-01", to: "2026-09-30" },
      },
    } as const;

    const report = await buildManagementReport(actor, query, { ...deps, clock });
    const snapshot = await computeManagementSnapshot(actor, query, { ...deps, clock });

    expect(report.snapshot.indicators).toEqual(snapshot.indicators);
    expect(report.snapshot.populationIds).toEqual(snapshot.populationIds);
    expect(report.activities.map((row) => row.id)).toEqual(snapshot.populationIds);
    expect(report.activities).toHaveLength(2);

    const page = paginateItems(report.activities, 1, 1);
    expect(page.items).toHaveLength(1);
    expect(report.activities).toHaveLength(snapshot.populationIds.length);
  });
});
