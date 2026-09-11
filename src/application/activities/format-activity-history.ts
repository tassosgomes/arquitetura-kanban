import {
  ACTIVITY_NATURE_LABELS,
  ARCHITECTURE_ROLE_LABELS,
  EFFORT_LABELS,
  PRIORITY_LABELS,
  type ArchitectureRole,
  type Effort,
  type Nature,
  type Priority,
} from "@/domain/catalog/classifications";
import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_TYPE_LABELS,
  type ActivityStatus,
  type ActivityType,
} from "@/domain/activity/enums";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import type { AuditEventRecord } from "@/application/ports/audit-repository";
import type { AuditChanges, AuditFieldChange, AuditJsonValue } from "@/application/audit/types";
import { ACTIVITY_TASK_AUDIT_FIELDS } from "@/application/audit/portrait";

function formatCivilDatePtBr(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

export const INACTIVE_RECORD_LABEL = "registro inativo";

export type HistoryReferenceLabels = {
  users: ReadonlyMap<string, string>;
  areas: ReadonlyMap<string, string>;
  domains: ReadonlyMap<string, string>;
  projects: ReadonlyMap<string, string>;
};


const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  responsavelId: "Responsável",
  participanteIds: "Participantes",
  areaSolicitanteId: "Área solicitante",
  areaEnvolvidaIds: "Áreas envolvidas",
  dominioId: "Domínio",
  natureza: "Natureza",
  papelArquitetura: "Papel da Arquitetura",
  tipo: "Tipo",
  projetoId: "Projeto",
  esforco: "Esforço",
  prioridade: "Prioridade",
  dataInicio: "Data de início",
  dataConclusao: "Data de conclusão",
  dataCancelamento: "Data de cancelamento",
  previsaoTermino: "Previsão de término",
  description: "Descrição da tarefa",
  isDone: "Tarefa concluída",
  sortOrder: "Ordem da tarefa",
};

function valuesEqual(left: AuditJsonValue, right: AuditJsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function changedFields(changes: AuditChanges): Array<[string, AuditFieldChange]> {
  return Object.entries(changes.fields).filter(([, change]) => !valuesEqual(change.before, change.after));
}

function asString(value: AuditJsonValue): string | null {
  return typeof value === "string" ? value : null;
}

function asStringList(value: AuditJsonValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function formatStatus(value: AuditJsonValue): string {
  const status = asString(value);
  if (!status) {
    return "—";
  }
  return ACTIVITY_STATUS_LABELS[status as ActivityStatus] ?? status;
}

function formatPriority(value: AuditJsonValue): string {
  const priority = asString(value);
  if (!priority) {
    return "—";
  }
  return PRIORITY_LABELS[priority as Priority] ?? priority;
}

function formatNature(value: AuditJsonValue): string {
  const nature = asString(value);
  if (!nature) {
    return "—";
  }
  return ACTIVITY_NATURE_LABELS[nature as Nature] ?? nature;
}

function formatArchitectureRole(value: AuditJsonValue): string {
  const role = asString(value);
  if (!role) {
    return "—";
  }
  return ARCHITECTURE_ROLE_LABELS[role as ArchitectureRole] ?? role;
}

function formatActivityType(value: AuditJsonValue): string {
  const type = asString(value);
  if (!type) {
    return "—";
  }
  return ACTIVITY_TYPE_LABELS[type as ActivityType] ?? type;
}

function formatEffort(value: AuditJsonValue): string {
  const effort = asString(value);
  if (!effort) {
    return "Não informado";
  }
  return EFFORT_LABELS[effort as Effort] ?? effort;
}

function formatDate(value: AuditJsonValue): string {
  const date = asString(value);
  if (!date) {
    return "—";
  }
  return formatCivilDatePtBr(date);
}

function formatBoolean(value: AuditJsonValue): string {
  if (value === true) {
    return "Sim";
  }
  if (value === false) {
    return "Não";
  }
  return "—";
}

function formatId(value: AuditJsonValue, resolve: (id: string) => string): string {
  const id = asString(value);
  if (!id) {
    return "—";
  }
  return resolve(id);
}

function formatIdList(value: AuditJsonValue, resolve: (id: string) => string): string {
  const ids = asStringList(value);
  if (ids.length === 0) {
    return "—";
  }
  return ids.map(resolve).join(", ");
}

function formatFieldValue(
  key: string,
  value: AuditJsonValue,
  resolve: HistoryReferenceLabels,
): string {
  switch (key) {
    case "status":
      return formatStatus(value);
    case "prioridade":
      return formatPriority(value);
    case "natureza":
      return formatNature(value);
    case "papelArquitetura":
      return formatArchitectureRole(value);
    case "tipo":
      return formatActivityType(value);
    case "esforco":
      return formatEffort(value);
    case "dataInicio":
    case "dataConclusao":
    case "dataCancelamento":
    case "previsaoTermino":
      return formatDate(value);
    case "responsavelId":
      return formatId(value, (id) => resolve.users.get(id) ?? INACTIVE_RECORD_LABEL);
    case "areaSolicitanteId":
      return formatId(value, (id) => resolve.areas.get(id) ?? INACTIVE_RECORD_LABEL);
    case "dominioId":
      return formatId(value, (id) => resolve.domains.get(id) ?? INACTIVE_RECORD_LABEL);
    case "projetoId":
      return formatId(value, (id) => resolve.projects.get(id) ?? INACTIVE_RECORD_LABEL);
    case "participanteIds":
      return formatIdList(value, (id) => resolve.users.get(id) ?? INACTIVE_RECORD_LABEL);
    case "areaEnvolvidaIds":
      return formatIdList(value, (id) => resolve.areas.get(id) ?? INACTIVE_RECORD_LABEL);
    case "description":
      return asString(value) ?? "—";
    case "isDone":
      return formatBoolean(value);
    case "sortOrder":
      return typeof value === "number" ? String(value) : "—";
    default:
      if (value == null) {
        return "—";
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }
      return "—";
  }
}

function formatFieldChange(
  key: string,
  change: AuditFieldChange,
  resolve: HistoryReferenceLabels,
): string {
  const label = FIELD_LABELS[key] ?? key;
  const before = formatFieldValue(key, change.before, resolve);
  const after = formatFieldValue(key, change.after, resolve);
  return `${label}: ${before} → ${after}`;
}

function formatChanges(changes: AuditChanges, resolve: HistoryReferenceLabels): string[] {
  return changedFields(changes).map(([key, change]) => formatFieldChange(key, change, resolve));
}

function taskDescription(changes: AuditChanges): string {
  const snapshot = changes.snapshot?.description;
  if (typeof snapshot === "string" && snapshot.length > 0) {
    return snapshot;
  }
  const field = changes.fields.description;
  if (field) {
    const value = field.after ?? field.before;
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return "Tarefa do checklist";
}

export function formatActivityHistoryEvent(
  event: AuditEventRecord,
  resolve: HistoryReferenceLabels,
): string {
  if (event.entityKind === AuditEntityKind.ActivityTask) {
    const description = taskDescription(event.changes);
    if (event.action === AuditAction.created) {
      return `Tarefa adicionada ao checklist: ${description}`;
    }
    if (event.action === AuditAction.deleted) {
      return `Tarefa removida do checklist: ${description}`;
    }
    const lines = formatChanges(event.changes, resolve);
    if (lines.length === 0) {
      return `Checklist atualizado: ${description}`;
    }
    return `Checklist (${description}): ${lines.join("; ")}`;
  }

  if (event.action === AuditAction.created) {
    return "Atividade criada";
  }

  if (event.action === AuditAction.cancelled) {
    const statusChange = event.changes.fields.status;
    if (statusChange && !valuesEqual(statusChange.before, statusChange.after)) {
      return `Atividade cancelada (${formatStatus(statusChange.before)} → ${formatStatus(statusChange.after)})`;
    }
    return "Atividade cancelada";
  }

  if (event.action === AuditAction.status_changed) {
    const statusChange = event.changes.fields.status;
    if (statusChange) {
      return `Status: ${formatStatus(statusChange.before)} → ${formatStatus(statusChange.after)}`;
    }
    return "Status alterado";
  }

  const lines = formatChanges(event.changes, resolve);
  if (lines.length === 1) {
    const [key] = changedFields(event.changes)[0] ?? [];
    if (key === "responsavelId") {
      const change = event.changes.fields.responsavelId;
      if (change) {
        const after = formatFieldValue("responsavelId", change.after, resolve);
        if (change.before == null) {
          return `Responsável alterado para ${after}`;
        }
        const before = formatFieldValue("responsavelId", change.before, resolve);
        return `Responsável: ${before} → ${after}`;
      }
    }
  }

  if (lines.length === 0) {
    return "Alteração registrada";
  }

  return lines.join("; ");
}

export function collectHistoryReferenceIds(events: readonly AuditEventRecord[]): {
  userIds: Set<string>;
  areaIds: Set<string>;
  domainIds: Set<string>;
  projectIds: Set<string>;
} {
  const userIds = new Set<string>();
  const areaIds = new Set<string>();
  const domainIds = new Set<string>();
  const projectIds = new Set<string>();

  for (const event of events) {
    userIds.add(event.actorUserId);

    const keys =
      event.entityKind === AuditEntityKind.ActivityTask
        ? ACTIVITY_TASK_AUDIT_FIELDS
        : Object.keys(event.changes.fields);

    for (const key of keys) {
      const change = event.changes.fields[key];
      if (!change) {
        continue;
      }
      for (const value of [change.before, change.after]) {
        switch (key) {
          case "responsavelId":
            if (typeof value === "string") {
              userIds.add(value);
            }
            break;
          case "participanteIds":
            for (const id of asStringList(value)) {
              userIds.add(id);
            }
            break;
          case "areaSolicitanteId":
            if (typeof value === "string") {
              areaIds.add(value);
            }
            break;
          case "areaEnvolvidaIds":
            for (const id of asStringList(value)) {
              areaIds.add(id);
            }
            break;
          case "dominioId":
            if (typeof value === "string") {
              domainIds.add(value);
            }
            break;
          case "projetoId":
            if (typeof value === "string") {
              projectIds.add(value);
            }
            break;
          default:
            break;
        }
      }
    }

    if (event.changes.snapshot) {
      for (const [key, value] of Object.entries(event.changes.snapshot)) {
        switch (key) {
          case "responsavelId":
            if (typeof value === "string") {
              userIds.add(value);
            }
            break;
          case "participanteIds":
            for (const id of asStringList(value)) {
              userIds.add(id);
            }
            break;
          case "areaSolicitanteId":
            if (typeof value === "string") {
              areaIds.add(value);
            }
            break;
          case "areaEnvolvidaIds":
            for (const id of asStringList(value)) {
              areaIds.add(id);
            }
            break;
          case "dominioId":
            if (typeof value === "string") {
              domainIds.add(value);
            }
            break;
          case "projetoId":
            if (typeof value === "string") {
              projectIds.add(value);
            }
            break;
          default:
            break;
        }
      }
    }
  }

  return { userIds, areaIds, domainIds, projectIds };
}
