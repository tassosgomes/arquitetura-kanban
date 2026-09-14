import {
  ARCHITECTURE_ROLE_LABELS,
  NATURE_LABELS,
  type ArchitectureRole,
  type Nature,
} from "@/domain/catalog/classifications";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/domain/project/project-status";
import type { AuditEventRecord } from "@/application/ports/audit-repository";
import type { AuditChanges, AuditFieldChange, AuditJsonValue } from "@/application/audit/types";
import { PROJECT_AUDIT_FIELDS, VALUE_DELIVERY_AUDIT_FIELDS } from "@/application/audit/portrait";
import {
  collectHistoryReferenceIds,
  formatActivityHistoryEvent,
  INACTIVE_RECORD_LABEL,
  type HistoryReferenceLabels,
} from "@/application/activities/format-activity-history";

function formatCivilDatePtBr(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

const PROJECT_FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  status: "Status",
  responsibleAreaId: "Área responsável",
  nature: "Natureza",
  architectureRole: "Papel da Arquitetura",
  participantIds: "Participantes",
  startDate: "Data de início",
  expectedEndDate: "Previsão de término",
};

const VALUE_DELIVERY_FIELD_LABELS: Record<string, string> = {
  title: "Título",
  referenceDate: "Data de referência",
  contentMarkdown: "Conteúdo",
  authorId: "Autor",
  projectId: "Projeto",
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

function formatProjectStatus(value: AuditJsonValue): string {
  const status = asString(value);
  if (!status) {
    return "—";
  }
  return PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status;
}

function formatNature(value: AuditJsonValue): string {
  const nature = asString(value);
  if (!nature) {
    return "—";
  }
  return NATURE_LABELS[nature as Nature] ?? nature;
}

function formatArchitectureRole(value: AuditJsonValue): string {
  const role = asString(value);
  if (!role) {
    return "—";
  }
  return ARCHITECTURE_ROLE_LABELS[role as ArchitectureRole] ?? role;
}

function formatDate(value: AuditJsonValue): string {
  const date = asString(value);
  if (!date) {
    return "—";
  }
  return formatCivilDatePtBr(date);
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

function formatProjectFieldValue(
  key: string,
  value: AuditJsonValue,
  resolve: HistoryReferenceLabels,
): string {
  switch (key) {
    case "status":
      return formatProjectStatus(value);
    case "nature":
      return formatNature(value);
    case "architectureRole":
      return formatArchitectureRole(value);
    case "startDate":
    case "expectedEndDate":
    case "referenceDate":
      return formatDate(value);
    case "authorId":
      return formatId(value, (id) => resolve.users.get(id) ?? INACTIVE_RECORD_LABEL);
    case "responsibleAreaId":
      return formatId(value, (id) => resolve.areas.get(id) ?? INACTIVE_RECORD_LABEL);
    case "participantIds":
      return formatIdList(value, (id) => resolve.users.get(id) ?? INACTIVE_RECORD_LABEL);
    case "name":
    case "title":
      return asString(value) ?? "—";
    case "contentMarkdown":
      return value == null || value === "" ? "—" : "Conteúdo registrado";
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

function formatProjectFieldChange(
  key: string,
  change: AuditFieldChange,
  resolve: HistoryReferenceLabels,
): string {
  const label = PROJECT_FIELD_LABELS[key] ?? VALUE_DELIVERY_FIELD_LABELS[key] ?? key;
  if (key === "contentMarkdown") {
    return "Conteúdo atualizado";
  }
  const before = formatProjectFieldValue(key, change.before, resolve);
  const after = formatProjectFieldValue(key, change.after, resolve);
  return `${label}: ${before} → ${after}`;
}

function formatEntityChanges(
  changes: AuditChanges,
  resolve: HistoryReferenceLabels,
  fieldLabels: Record<string, string>,
): string[] {
  return changedFields(changes).map(([key, change]) => {
    if (!(key in fieldLabels)) {
      return formatProjectFieldChange(key, change, resolve);
    }
    return formatProjectFieldChange(key, change, resolve);
  });
}

function formatProjectEntityEvent(event: AuditEventRecord, resolve: HistoryReferenceLabels): string {
  if (event.action === AuditAction.created) {
    return "Projeto criado";
  }

  if (event.action === AuditAction.cancelled) {
    const statusChange = event.changes.fields.status;
    if (statusChange && !valuesEqual(statusChange.before, statusChange.after)) {
      return `Projeto cancelado (${formatProjectStatus(statusChange.before)} → ${formatProjectStatus(statusChange.after)})`;
    }
    return "Projeto cancelado";
  }

  const lines = formatEntityChanges(event.changes, resolve, PROJECT_FIELD_LABELS);
  if (lines.length === 0) {
    return "Alteração registrada";
  }
  return lines.join("; ");
}

function formatValueDeliveryEntityEvent(
  event: AuditEventRecord,
  resolve: HistoryReferenceLabels,
): string {
  if (event.action === AuditAction.created) {
    const snapshotTitle = event.changes.snapshot?.title;
    const fieldTitle = event.changes.fields.title?.after;
    const title =
      (snapshotTitle != null ? asString(snapshotTitle) : null) ??
      (fieldTitle != null ? asString(fieldTitle) : null);
    return title ? `Entrega de valor criada: ${title}` : "Entrega de valor criada";
  }

  const lines = formatEntityChanges(event.changes, resolve, VALUE_DELIVERY_FIELD_LABELS);
  if (lines.length === 0) {
    return "Entrega de valor atualizada";
  }
  return lines.join("; ");
}

export function formatProjectHistoryEvent(
  event: AuditEventRecord,
  resolve: HistoryReferenceLabels,
): string {
  switch (event.entityKind) {
    case AuditEntityKind.Project:
      return formatProjectEntityEvent(event, resolve);
    case AuditEntityKind.Activity:
    case AuditEntityKind.ActivityTask:
      return formatActivityHistoryEvent(event, resolve);
    case AuditEntityKind.ValueDelivery:
      return formatValueDeliveryEntityEvent(event, resolve);
    default:
      return "Evento registrado";
  }
}

export type ProjectHistorySource = {
  sourceKind: "project" | "activity" | "valueDelivery";
  sourceLabel: string;
  sourceHref: string | null;
};

export type ProjectHistoryContext = {
  projectId: string;
  projectName: string;
  activityTitles: ReadonlyMap<string, string>;
  deliveryTitles: ReadonlyMap<string, string>;
};

function titleFromAuditChanges(changes: AuditChanges): string | null {
  const snapshotTitle = changes.snapshot?.title;
  if (typeof snapshotTitle === "string" && snapshotTitle.length > 0) {
    return snapshotTitle;
  }
  const fieldTitle = changes.fields.title;
  const value = fieldTitle?.after ?? fieldTitle?.before;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function resolveProjectHistorySource(
  event: AuditEventRecord,
  context: ProjectHistoryContext,
): ProjectHistorySource {
  switch (event.entityKind) {
    case AuditEntityKind.Project:
      return {
        sourceKind: "project",
        sourceLabel: "Projeto",
        sourceHref: `/projects/${context.projectId}`,
      };
    case AuditEntityKind.Activity: {
      const title = context.activityTitles.get(event.entityId) ?? "Atividade";
      return {
        sourceKind: "activity",
        sourceLabel: `Atividade: ${title}`,
        sourceHref: `/activities/${event.entityId}`,
      };
    }
    case AuditEntityKind.ActivityTask: {
      const activityId = event.activityId ?? event.entityId;
      const title = context.activityTitles.get(activityId) ?? "Atividade";
      return {
        sourceKind: "activity",
        sourceLabel: `Atividade: ${title}`,
        sourceHref: event.activityId ? `/activities/${event.activityId}` : null,
      };
    }
    case AuditEntityKind.ValueDelivery: {
      const title =
        context.deliveryTitles.get(event.entityId) ??
        titleFromAuditChanges(event.changes) ??
        "Entrega de valor";
      return {
        sourceKind: "valueDelivery",
        sourceLabel: `Entrega: ${title}`,
        sourceHref: `/projects/${context.projectId}/value-deliveries/${event.entityId}`,
      };
    }
    default:
      return {
        sourceKind: "project",
        sourceLabel: context.projectName,
        sourceHref: `/projects/${context.projectId}`,
      };
  }
}

export function collectProjectHistoryReferenceIds(events: readonly AuditEventRecord[]): {
  userIds: Set<string>;
  areaIds: Set<string>;
  domainIds: Set<string>;
  projectIds: Set<string>;
} {
  const activityIds = collectHistoryReferenceIds(
    events.filter(
      (event) =>
        event.entityKind === AuditEntityKind.Activity ||
        event.entityKind === AuditEntityKind.ActivityTask,
    ),
  );

  const merged = {
    userIds: new Set(activityIds.userIds),
    areaIds: new Set(activityIds.areaIds),
    domainIds: new Set(activityIds.domainIds),
    projectIds: new Set(activityIds.projectIds),
  };

  for (const event of events) {
    merged.userIds.add(event.actorUserId);

    if (event.entityKind === AuditEntityKind.Project) {
      for (const key of PROJECT_AUDIT_FIELDS) {
        const change = event.changes.fields[key];
        if (!change) {
          continue;
        }
        for (const value of [change.before, change.after]) {
          switch (key) {
            case "participantIds":
              for (const id of asStringList(value)) {
                merged.userIds.add(id);
              }
              break;
            case "responsibleAreaId":
              if (typeof value === "string") {
                merged.areaIds.add(value);
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
            case "participantIds":
              for (const id of asStringList(value)) {
                merged.userIds.add(id);
              }
              break;
            case "responsibleAreaId":
              if (typeof value === "string") {
                merged.areaIds.add(value);
              }
              break;
            default:
              break;
          }
        }
      }
    }

    if (event.entityKind === AuditEntityKind.ValueDelivery) {
      for (const key of VALUE_DELIVERY_AUDIT_FIELDS) {
        const change = event.changes.fields[key];
        if (!change) {
          continue;
        }
        for (const value of [change.before, change.after]) {
          if (key === "authorId" && typeof value === "string") {
            merged.userIds.add(value);
          }
        }
      }
      const snapshotAuthor = event.changes.snapshot?.authorId;
      if (typeof snapshotAuthor === "string") {
        merged.userIds.add(snapshotAuthor);
      }
    }
  }

  return merged;
}
