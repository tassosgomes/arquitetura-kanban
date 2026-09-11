import type { AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import type { AuditChanges } from "@/application/audit/types";

export type AuditEventRecord = {
  id: string;
  sequence: bigint;
  occurredAt: Date;
  actorUserId: string;
  entityKind: AuditEntityKind;
  entityId: string;
  action: string;
  activityId: string | null;
  changes: AuditChanges;
};

export type ListActivityAuditEventsInput = {
  activityId: string;
  limit: number;
  /** Fetch events with `sequence` strictly less than this cursor (older page). */
  beforeSequence?: bigint | null;
};

export type ListActivityAuditEventsResult = {
  events: AuditEventRecord[];
  hasMore: boolean;
};

export interface AuditRepository {
  listForActivity(input: ListActivityAuditEventsInput): Promise<ListActivityAuditEventsResult>;
}
