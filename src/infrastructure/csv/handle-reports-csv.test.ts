import { describe, expect, it, vi } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { UnauthorizedError } from "@/domain/errors";
import type { LocalUser } from "@/domain/identity/local-user";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AuditRepository } from "@/application/ports/audit-repository";
import type { AreaRepository, CatalogUserRepository, DomainRepository } from "@/application/ports/catalog-repositories";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ActivityListItem } from "@/application/activities/types";
import { buildActivityCreatedChanges, emptyActivityPortrait } from "@/application/audit";
import type { AuditEventRecord } from "@/application/ports/audit-repository";
import { AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { CSV_NEWLINE, CSV_UTF8_BOM } from "@/infrastructure/csv/encode";
import { handleReportsCsvGet } from "@/infrastructure/csv/handle-reports-csv";

const actor: LocalUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  oidcIssuer: "https://t27.test",
  oidcSubject: "actor",
  isActive: true,
};

const ana = "11111111-1111-4111-8111-111111111111";

function listItem(
  overrides: Partial<ActivityListItem> & Pick<ActivityListItem, "id" | "title" | "status">,
): ActivityListItem {
  return {
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
  const areas = {
    list: vi.fn(async () => [{ id: "ar-fin", name: "Financeiro", isActive: true }]),
  } as unknown as AreaRepository;
  const domains = {
    list: vi.fn(async () => [{ id: "d-arq", name: "Arquitetura", isActive: true }]),
  } as unknown as DomainRepository;
  const projects = { list: vi.fn(async () => []) } as unknown as ProjectRepository;

  return { activities, audit, users, areas, domains, projects };
}

describe("GET /api/reports/csv (T27)", () => {
  it("returns 401 without an authenticated active user", async () => {
    const deps = emptyRepos([], []);
    const list = deps.activities.list as ReturnType<typeof vi.fn>;
    const response = await handleReportsCsvGet(new Request("http://localhost/api/reports/csv"), {
      authenticate: async () => {
        throw new UnauthorizedError();
      },
      ...deps,
    });
    expect(response.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it("exports the full population with BOM even when page is in the query", async () => {
    const listed = [
      listItem({ id: "a-1", title: "=CMD()", status: ActivityStatus.IN_PROGRESS }),
      listItem({ id: "a-2", title: 'São "Paulo"', status: ActivityStatus.IN_PROGRESS }),
    ];
    const events = [auditRecord("a-1", 1n), auditRecord("a-2", 2n)];
    const deps = emptyRepos(listed, events);
    const clock = { now: () => new Date("2026-09-10T15:00:00-03:00") };

    const response = await handleReportsCsvGet(
      new Request("http://localhost/api/reports/csv?period=THIS_MONTH&page=1"),
      {
        authenticate: async () => actor,
        ...deps,
        clock,
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("relatorio-atividades.csv");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    expect(text.startsWith(CSV_UTF8_BOM)).toBe(true);
    expect(text).toContain(CSV_NEWLINE);
    expect(text).toContain("\"'=CMD()\"");
    expect(text).toContain("São \"\"Paulo\"\"");
    expect(text).toContain("a-1");
    expect(text).toContain("a-2");
    const dataRows = text.trimEnd().split(CSV_NEWLINE).slice(1);
    expect(dataRows).toHaveLength(2);
  });
});
