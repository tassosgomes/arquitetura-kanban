import { describe, expect, it } from "vitest";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import type { AuditEventRecord } from "@/application/ports/audit-repository";
import {
  formatActivityHistoryEvent,
  INACTIVE_RECORD_LABEL,
  type HistoryReferenceLabels,
} from "@/application/activities/format-activity-history";

function event(overrides: Partial<AuditEventRecord> & Pick<AuditEventRecord, "action" | "changes">): AuditEventRecord {
  return {
    id: "event-1",
    sequence: BigInt(1),
    occurredAt: new Date("2026-09-10T18:00:00.000Z"),
    actorUserId: "actor-1",
    entityKind: AuditEntityKind.Activity,
    entityId: "activity-1",
    activityId: "activity-1",
    ...overrides,
  };
}

const labels: HistoryReferenceLabels = {
  users: new Map([
    ["ana", "Ana Silva (ana@example.com)"],
    ["carlos", "Carlos Souza (carlos@example.com)"],
  ]),
  areas: new Map([["area-1", "Arquitetura"]]),
  domains: new Map([["domain-1", "Integração"]]),
  projects: new Map([["project-1", "Projeto ERP"]]),
};

describe("formatActivityHistoryEvent", () => {
  it("describes activity creation in Portuguese", () => {
    const summary = formatActivityHistoryEvent(
      event({
        action: AuditAction.created,
        changes: {
          snapshot: { status: "BACKLOG", responsavelId: "carlos" },
          fields: {
            status: { before: null, after: "BACKLOG" },
            responsavelId: { before: null, after: "carlos" },
          },
        },
      }),
      labels,
    );

    expect(summary).toBe("Atividade criada");
  });

  it("describes status transitions without raw JSON", () => {
    const summary = formatActivityHistoryEvent(
      event({
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

  it("describes owner changes with resolved names", () => {
    const summary = formatActivityHistoryEvent(
      event({
        action: AuditAction.field_changed,
        changes: {
          fields: {
            responsavelId: { before: "carlos", after: "ana" },
          },
        },
      }),
      labels,
    );

    expect(summary).toBe(
      "Responsável: Carlos Souza (carlos@example.com) → Ana Silva (ana@example.com)",
    );
  });

  it("uses inactive-record fallback when a reference id cannot be resolved", () => {
    const summary = formatActivityHistoryEvent(
      event({
        action: AuditAction.field_changed,
        changes: {
          fields: {
            responsavelId: { before: "missing-user", after: "ana" },
          },
        },
      }),
      labels,
    );

    expect(summary).toContain(INACTIVE_RECORD_LABEL);
    expect(summary).toContain("Ana Silva");
  });

  it("distinguishes completion and reopening through status and date changes", () => {
    const completion = formatActivityHistoryEvent(
      event({
        sequence: BigInt(10),
        action: AuditAction.status_changed,
        changes: {
          fields: {
            status: { before: "IN_PROGRESS", after: "DONE" },
          },
        },
      }),
      labels,
    );
    const reopen = formatActivityHistoryEvent(
      event({
        sequence: BigInt(11),
        action: AuditAction.status_changed,
        changes: {
          fields: {
            status: { before: "DONE", after: "IN_PROGRESS" },
          },
        },
      }),
      labels,
    );
    const clearCompletion = formatActivityHistoryEvent(
      event({
        sequence: BigInt(12),
        action: AuditAction.field_changed,
        changes: {
          fields: {
            dataConclusao: { before: "2026-09-18", after: null },
          },
        },
      }),
      labels,
    );

    expect(completion).toBe("Status: Em andamento → Concluído");
    expect(reopen).toBe("Status: Concluído → Em andamento");
    expect(clearCompletion).toBe("Data de conclusão: 18/09/2026 → —");
  });
});
