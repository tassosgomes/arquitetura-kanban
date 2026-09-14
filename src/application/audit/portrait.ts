import type { AuditJsonValue } from "@/application/audit/types";

/**
 * Portrait dimensions for activities (domain-rules.md §10.2). Persist these keys
 * in `changes.snapshot` / `changes.fields` so T25 can call `valor_no_fechamento`.
 */
export const ACTIVITY_PORTRAIT_FIELDS = [
  "status",
  "responsavelId",
  "participanteIds",
  "areaSolicitanteId",
  "areaEnvolvidaIds",
  "dominioId",
  "natureza",
  "papelArquitetura",
  "tipo",
  "projetoId",
  "esforco",
  "prioridade",
  "dataInicio",
  "dataConclusao",
  "dataCancelamento",
  "previsaoTermino",
] as const;

export type ActivityPortraitField = (typeof ACTIVITY_PORTRAIT_FIELDS)[number];

export type ActivityPortrait = Record<ActivityPortraitField, AuditJsonValue>;

/** Suggested keys for Project audit (T11). Not used by the activity portrait. */
export const PROJECT_AUDIT_FIELDS = [
  "name",
  "status",
  "responsibleAreaId",
  "nature",
  "architectureRole",
  "participantIds",
  "startDate",
  "expectedEndDate",
] as const;

export type ProjectAuditField = (typeof PROJECT_AUDIT_FIELDS)[number];

/** ValueDelivery aggregate (T23). Independent of the project portrait (RN-18). */
export const VALUE_DELIVERY_AUDIT_FIELDS = [
  "title",
  "referenceDate",
  "contentMarkdown",
  "projectId",
  "authorId",
] as const;

export type ValueDeliveryAuditField = (typeof VALUE_DELIVERY_AUDIT_FIELDS)[number];

/** Area / ArchitectureDomain (T09). No `version`. */
export const CATALOG_AUDIT_FIELDS = ["name", "isActive"] as const;

/** Checklist item (T15). Do not include activity portrait keys (RN-20). */
export const ACTIVITY_TASK_AUDIT_FIELDS = ["description", "isDone", "sortOrder"] as const;

export type ActivityTaskAuditField = (typeof ACTIVITY_TASK_AUDIT_FIELDS)[number];

export function activityTaskAuditSnapshot(task: {
  description: string;
  isDone: boolean;
  sortOrder: number;
}) {
  return {
    description: task.description,
    isDone: task.isDone,
    sortOrder: task.sortOrder,
  };
}

export type CatalogAuditField = (typeof CATALOG_AUDIT_FIELDS)[number];

export function catalogAuditSnapshot(item: { name: string; isActive: boolean }) {
  return {
    name: item.name,
    isActive: item.isActive,
  };
}

/**
 * Calendar DATE → `YYYY-MM-DD`. Prisma `@db.Date` values are midnight UTC for that day.
 * `null` / `undefined` → `null` (effort, optional dates).
 */
export function toAuditDate(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

/** Stable JSON for id collections (participants, involved areas). */
export function toAuditIdList(ids: readonly string[]): string[] {
  return [...ids].sort();
}

export function emptyActivityPortrait(
  overrides: Partial<ActivityPortrait> = {},
): ActivityPortrait {
  const snapshot = {
    status: null,
    responsavelId: null,
    participanteIds: [],
    areaSolicitanteId: null,
    areaEnvolvidaIds: [],
    dominioId: null,
    natureza: null,
    papelArquitetura: null,
    tipo: null,
    projetoId: null,
    esforco: null,
    prioridade: null,
    dataInicio: null,
    dataConclusao: null,
    dataCancelamento: null,
    previsaoTermino: null,
  } satisfies ActivityPortrait;

  return { ...snapshot, ...overrides };
}
