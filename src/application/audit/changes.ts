import {
  ACTIVITY_PORTRAIT_FIELDS,
  emptyActivityPortrait,
  type ActivityPortrait,
} from "@/application/audit/portrait";
import type { AuditChanges, AuditFieldChange, AuditJsonValue } from "@/application/audit/types";

function uniqueKeys(keys: readonly string[]): string[] {
  return [...new Set(keys)];
}

function toFields(
  before: Record<string, AuditJsonValue>,
  after: Record<string, AuditJsonValue>,
  keys: readonly string[],
): Record<string, AuditFieldChange> {
  const fields: Record<string, AuditFieldChange> = {};
  for (const key of keys) {
    fields[key] = {
      before: before[key] ?? null,
      after: after[key] ?? null,
    };
  }
  return fields;
}

/** Creation: snapshot + fields with `before: null` (T12 / T02 §10.2). */
export function buildCreatedChanges(snapshot: Record<string, AuditJsonValue>): AuditChanges {
  return {
    snapshot: { ...snapshot },
    fields: toFields({}, snapshot, Object.keys(snapshot)),
  };
}

/**
 * Update: before/after for the given keys (default: union of both objects).
 * Include every portrait dimension even when unchanged so T25 can take the last event.
 */
export function buildUpdatedChanges(
  before: Record<string, AuditJsonValue>,
  after: Record<string, AuditJsonValue>,
  keys?: readonly string[],
): AuditChanges {
  const fieldKeys = keys ?? uniqueKeys([...Object.keys(before), ...Object.keys(after)]);
  return { fields: toFields(before, after, fieldKeys) };
}

export function buildActivityCreatedChanges(
  portrait: Partial<ActivityPortrait>,
): AuditChanges {
  return buildCreatedChanges(emptyActivityPortrait(portrait));
}

export function buildActivityUpdatedChanges(
  before: Partial<ActivityPortrait>,
  after: Partial<ActivityPortrait>,
): AuditChanges {
  const previous = emptyActivityPortrait(before);
  const next = emptyActivityPortrait(after);
  return buildUpdatedChanges(previous, next, ACTIVITY_PORTRAIT_FIELDS);
}
