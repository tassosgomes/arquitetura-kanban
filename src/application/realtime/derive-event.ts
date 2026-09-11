import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import type { AuditEventWrite } from "@/application/audit/types";
import {
  RealtimeEventType,
  type RealtimeEventDraft,
  type RealtimePayload,
} from "@/application/realtime/types";

function withProjectId(base: RealtimePayload, projectId: string | null | undefined): RealtimePayload {
  if (!projectId) {
    return base;
  }
  return { ...base, projectId };
}

function deriveOne(write: AuditEventWrite): RealtimeEventDraft | null {
  switch (write.entityKind) {
    case AuditEntityKind.Activity: {
      const payload = withProjectId(
        { entityKind: "activity", entityId: write.entityId },
        write.projectId,
      );
      if (write.action === AuditAction.created) {
        return { type: RealtimeEventType.ActivityCreated, payload };
      }
      if (write.action === AuditAction.status_changed || write.action === AuditAction.cancelled) {
        return { type: RealtimeEventType.ActivityStatusChanged, payload };
      }
      return { type: RealtimeEventType.ActivityUpdated, payload };
    }
    case AuditEntityKind.ActivityTask: {
      return {
        type: RealtimeEventType.ActivityChecklistChanged,
        payload: {
          entityKind: "task",
          entityId: write.entityId,
          activityId: write.activityId ?? write.entityId,
        },
      };
    }
    case AuditEntityKind.Project:
      return {
        type: RealtimeEventType.ProjectChanged,
        payload: { entityKind: "project", entityId: write.entityId },
      };
    case AuditEntityKind.Area:
      return {
        type: RealtimeEventType.CatalogChanged,
        payload: { entityKind: "area", entityId: write.entityId },
      };
    case AuditEntityKind.Domain:
      return {
        type: RealtimeEventType.CatalogChanged,
        payload: { entityKind: "domain", entityId: write.entityId },
      };
    case AuditEntityKind.ValueDelivery:
      return {
        type: RealtimeEventType.ValueDeliveryChanged,
        payload: withProjectId(
          { entityKind: "valueDelivery", entityId: write.entityId },
          write.projectId,
        ),
      };
    case AuditEntityKind.User:
      return null;
    default: {
      const exhaustive: never = write.entityKind;
      void exhaustive;
      return null;
    }
  }
}

function draftKey(draft: RealtimeEventDraft): string {
  return [
    draft.type,
    draft.payload.entityKind,
    draft.payload.entityId,
    draft.payload.activityId ?? "",
    draft.payload.projectId ?? "",
  ].join(":");
}

/**
 * One invalidation signal per distinct type+entity in the mutation.
 * Status changes that also audit date fields collapse to `activity.status_changed`.
 */
export function deriveRealtimeEvents(
  writes: readonly AuditEventWrite[],
): RealtimeEventDraft[] {
  const drafts: RealtimeEventDraft[] = [];
  const seen = new Set<string>();

  const statusActivityIds = new Set(
    writes
      .filter(
        (write) =>
          write.entityKind === AuditEntityKind.Activity &&
          (write.action === AuditAction.status_changed || write.action === AuditAction.cancelled),
      )
      .map((write) => write.entityId),
  );

  for (const write of writes) {
    if (
      write.entityKind === AuditEntityKind.Activity &&
      write.action === AuditAction.field_changed &&
      statusActivityIds.has(write.entityId)
    ) {
      continue;
    }
    const draft = deriveOne(write);
    if (!draft) {
      continue;
    }
    const key = draftKey(draft);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    drafts.push(draft);
  }

  return drafts;
}
