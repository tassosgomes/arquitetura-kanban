/**
 * Domain realtime signals (docs/realtime.md §2.2).
 * These are cache-invalidation hints, not workflow transitions.
 *
 * `resync` is **not** a persisted type — it is an SSE control frame only.
 */
export const RealtimeEventType = {
  ActivityCreated: "activity.created",
  ActivityUpdated: "activity.updated",
  ActivityStatusChanged: "activity.status_changed",
  ActivityChecklistChanged: "activity.checklist_changed",
  ProjectChanged: "project.changed",
  CatalogChanged: "catalog.changed",
  ValueDeliveryChanged: "value_delivery.changed",
} as const;

export type RealtimeEventType = (typeof RealtimeEventType)[keyof typeof RealtimeEventType];

export type RealtimePayloadEntityKind =
  | "activity"
  | "task"
  | "project"
  | "area"
  | "domain"
  | "valueDelivery";

/**
 * Minimum payload for query invalidation. No entity snapshots.
 * Duplicate frames with the same `RealtimeEvent.id` are tolerated by clients (T22).
 */
export type RealtimePayload = {
  entityKind: RealtimePayloadEntityKind;
  entityId: string;
  activityId?: string;
  projectId?: string;
};

export type RealtimeEventDraft = {
  type: RealtimeEventType;
  payload: RealtimePayload;
};
