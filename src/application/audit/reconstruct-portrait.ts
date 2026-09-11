import {
  ACTIVITY_PORTRAIT_FIELDS,
  type ActivityPortraitField,
} from "@/application/audit/portrait";
import type { AuditChanges, AuditJsonValue } from "@/application/audit/types";
import { isBeforeFechamento, type Instant } from "@/application/temporal";

/**
 * Sentinel for DE-05: no audit event with `occurredAt < fechamento_exclusivo`
 * mentions the field. Distinct from JSON `null` (e.g. esforço não informado).
 */
export const PORTRAIT_ABSENT = "AUSENTE" as const;
export type PortraitAbsent = typeof PORTRAIT_ABSENT;

export type PortraitFieldValue = AuditJsonValue | PortraitAbsent;

/** Minimal event shape for `valor_no_fechamento` (DE-04 / DE-20). */
export type PortraitSourceEvent = {
  occurredAt: Instant;
  sequence: bigint;
  changes: AuditChanges;
};

export type ReconstructedActivityPortrait = {
  [K in ActivityPortraitField]: PortraitFieldValue;
};

function isRecord(value: unknown): value is Record<string, AuditJsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mentionsField(changes: AuditChanges, field: ActivityPortraitField): boolean {
  if (changes.snapshot && Object.prototype.hasOwnProperty.call(changes.snapshot, field)) {
    return true;
  }
  return Boolean(changes.fields && Object.prototype.hasOwnProperty.call(changes.fields, field));
}

function valueFromEvent(changes: AuditChanges, field: ActivityPortraitField): AuditJsonValue {
  if (changes.snapshot && Object.prototype.hasOwnProperty.call(changes.snapshot, field)) {
    return changes.snapshot[field] ?? null;
  }
  const change = changes.fields?.[field];
  if (change && Object.prototype.hasOwnProperty.call(change, "after")) {
    return change.after;
  }
  return null;
}

/** DE-20: later `occurredAt` wins; same instant → greater `sequence` (not UUID). */
export function comparePortraitEvents(left: PortraitSourceEvent, right: PortraitSourceEvent): number {
  const byTime = left.occurredAt.getTime() - right.occurredAt.getTime();
  if (byTime !== 0) {
    return byTime;
  }
  if (left.sequence === right.sequence) {
    return 0;
  }
  return left.sequence < right.sequence ? -1 : 1;
}

/**
 * `valor_no_fechamento` (domain-rules.md §10.2 / audit.md §2).
 * Last event with `occurredAt < fechamentoExclusivo` that mentions `field`.
 */
export function valueAtClosing(
  events: readonly PortraitSourceEvent[],
  field: ActivityPortraitField,
  fechamentoExclusivo: Instant,
): PortraitFieldValue {
  let last: PortraitSourceEvent | undefined;
  for (const event of events) {
    if (!isBeforeFechamento(event.occurredAt, fechamentoExclusivo)) {
      continue;
    }
    if (!mentionsField(event.changes, field)) {
      continue;
    }
    if (!last || comparePortraitEvents(event, last) > 0) {
      last = event;
    }
  }
  if (!last) {
    return PORTRAIT_ABSENT;
  }
  return valueFromEvent(last.changes, field);
}

export function reconstructActivityPortrait(
  events: readonly PortraitSourceEvent[],
  fechamentoExclusivo: Instant,
): ReconstructedActivityPortrait {
  const portrait = {} as ReconstructedActivityPortrait;
  for (const field of ACTIVITY_PORTRAIT_FIELDS) {
    portrait[field] = valueAtClosing(events, field, fechamentoExclusivo);
  }
  return portrait;
}

export function isPortraitAbsent(value: PortraitFieldValue): value is PortraitAbsent {
  return value === PORTRAIT_ABSENT;
}

export function portraitHasStatus(portrait: ReconstructedActivityPortrait): boolean {
  return !isPortraitAbsent(portrait.status) && portrait.status != null;
}

export function asPortraitId(value: PortraitFieldValue): string | null {
  return typeof value === "string" && value !== PORTRAIT_ABSENT ? value : null;
}

export function asPortraitIdList(value: PortraitFieldValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

/** `{solicitante} ∪ envolvidas`, ignoring nulls and AUSENTE (DE-19 via Set). */
export function areaIdsFromPortrait(portrait: ReconstructedActivityPortrait): Set<string> {
  const ids = new Set<string>();
  const solicitante = asPortraitId(portrait.areaSolicitanteId);
  if (solicitante) {
    ids.add(solicitante);
  }
  for (const id of asPortraitIdList(portrait.areaEnvolvidaIds)) {
    ids.add(id);
  }
  return ids;
}

export function isUsableActivityPortrait(portrait: ReconstructedActivityPortrait): boolean {
  return portraitHasStatus(portrait);
}

export function parsePortraitEvents(
  events: readonly { occurredAt: Date; sequence: bigint; changes: unknown }[],
): PortraitSourceEvent[] {
  return events.map((event) => ({
    occurredAt: event.occurredAt,
    sequence: event.sequence,
    changes: isAuditChanges(event.changes) ? event.changes : { fields: {} },
  }));
}

function isAuditChanges(value: unknown): value is AuditChanges {
  if (!isRecord(value)) {
    return false;
  }
  return isRecord(value.fields) || value.fields === undefined;
}
