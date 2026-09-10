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
  "architectureOwnerId",
  "responsibleAreaId",
  "nature",
  "architectureRole",
  "participantIds",
  "startDate",
  "expectedEndDate",
] as const;

export type ProjectAuditField = (typeof PROJECT_AUDIT_FIELDS)[number];

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
