import { describe, expect, it } from "vitest";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import type { AuditEventRecord } from "@/application/ports/audit-repository";
import {
  formatProjectHistoryEvent,
  resolveProjectHistorySource,
} from "@/application/projects/format-project-history";
import type { HistoryReferenceLabels } from "@/application/activities/format-activity-history";

function event(overrides: Partial<AuditEventRecord> & Pick<AuditEventRecord, "action" | "changes">): AuditEventRecord {
  return {
    id: "event-1",
    sequence: BigInt(1),
    occurredAt: new Date("2026-09-10T18:00:00.000Z"),
    actorUserId: "actor-1",
    entityKind: AuditEntityKind.Project,
    entityId: "project-1",
    activityId: null,
    ...overrides,
  };
}

const labels: HistoryReferenceLabels = {
  users: new Map([["owner-1", "Ana Silva (ana@example.com)"]]),
  areas: new Map([["area-1", "Arquitetura"]]),
  domains: new Map(),
  projects: new Map([["project-1", "Projeto ERP"]]),
};

const context = {
  projectId: "project-1",
  projectName: "Projeto ERP",
  activityTitles: new Map([["activity-1", "Integrar API"]]),
  deliveryTitles: new Map([["delivery-1", "Relatório de arquitetura"]]),
};

describe("formatProjectHistoryEvent", () => {
  it("describes project creation in Portuguese", () => {
    const summary = formatProjectHistoryEvent(
      event({
        action: AuditAction.created,
        changes: {
          snapshot: { name: "Projeto ERP", status: "PLANNED" },
          fields: {
            name: { before: null, after: "Projeto ERP" },
            status: { before: null, after: "PLANNED" },
          },
        },
      }),
      labels,
    );

    expect(summary).toBe("Projeto criado");
  });

  it("describes project cancellation without raw JSON", () => {
    const summary = formatProjectHistoryEvent(
      event({
        action: AuditAction.cancelled,
        changes: {
          fields: {
            status: { before: "IN_PROGRESS", after: "CANCELLED" },
          },
        },
      }),
      labels,
    );

    expect(summary).toBe("Projeto cancelado (Em andamento → Cancelado)");
  });

  it("reuses activity formatter for linked activity events", () => {
    const summary = formatProjectHistoryEvent(
      event({
        entityKind: AuditEntityKind.Activity,
        entityId: "activity-1",
        activityId: "activity-1",
        action: AuditAction.status_changed,
        changes: {
          fields: {
            status: { before: "BACKLOG", after: "IN_PROGRESS" },
          },
        },
      }),
      labels,
    );

    expect(summary).toBe("Status: Backlog → Em andamento");
  });

  it("describes value delivery updates without dumping markdown", () => {
    const summary = formatProjectHistoryEvent(
      event({
        entityKind: AuditEntityKind.ValueDelivery,
        entityId: "delivery-1",
        action: AuditAction.field_changed,
        changes: {
          fields: {
            contentMarkdown: { before: "# Antigo", after: "# Novo" },
          },
        },
      }),
      labels,
    );

    expect(summary).toBe("Conteúdo atualizado");
  });
});

describe("resolveProjectHistorySource", () => {
  it("identifies project, activity and delivery origins", () => {
    expect(
      resolveProjectHistorySource(
        event({ action: AuditAction.created, changes: { fields: {}, snapshot: {} } }),
        context,
      ),
    ).toEqual({
      sourceKind: "project",
      sourceLabel: "Projeto",
      sourceHref: "/projects/project-1",
    });

    expect(
      resolveProjectHistorySource(
        event({
          entityKind: AuditEntityKind.Activity,
          entityId: "activity-1",
          activityId: "activity-1",
          action: AuditAction.created,
          changes: { fields: {}, snapshot: {} },
        }),
        context,
      ),
    ).toEqual({
      sourceKind: "activity",
      sourceLabel: "Atividade: Integrar API",
      sourceHref: "/activities/activity-1",
    });

    expect(
      resolveProjectHistorySource(
        event({
          entityKind: AuditEntityKind.ValueDelivery,
          entityId: "delivery-1",
          action: AuditAction.created,
          changes: {
            snapshot: { title: "Relatório de arquitetura" },
            fields: { title: { before: null, after: "Relatório de arquitetura" } },
          },
        }),
        context,
      ),
    ).toEqual({
      sourceKind: "valueDelivery",
      sourceLabel: "Entrega: Relatório de arquitetura",
      sourceHref: "/projects/project-1/value-deliveries/delivery-1",
    });
  });
});
