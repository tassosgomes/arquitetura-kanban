import type { AuditEntityKind } from "@/domain/audit/audit-entity-kind";

/** Aggregates with `version` (architecture.md §10). ActivityTask uses Activity.version. */
export type VersionedAggregateModel = "project" | "activity" | "valueDelivery";

/**
 * JSON-serializable value stored in `AuditEvent.changes`.
 * Calendar dates: `YYYY-MM-DD`. Instants: ISO-8601 UTC. Id lists: sorted UUID strings.
 */
export type AuditJsonPrimitive = string | number | boolean | null;
export type AuditJsonValue =
  | AuditJsonPrimitive
  | AuditJsonValue[]
  | { readonly [key: string]: AuditJsonValue };

export type AuditFieldChange = {
  before: AuditJsonValue;
  after: AuditJsonValue;
};

/**
 * `AuditEvent.changes` (jsonb). T25 reconstructs the portrait from this shape
 * (domain-rules.md §10.2 / DE-04).
 *
 * - **create:** `snapshot` is the full initial state; `fields[k].before` is always `null`.
 * - **update:** `fields` has before/after for every dimension of the portrait (unchanged:
 *   `before === after`). `snapshot` is omitted.
 */
export type AuditChanges = {
  snapshot?: Record<string, AuditJsonValue>;
  fields: Record<string, AuditFieldChange>;
};

export type AuditEventWrite = {
  entityKind: AuditEntityKind;
  entityId: string;
  /** Stable action string (`AuditAction` or a later T14/T15/T23 verb). Not a PG enum. */
  action: string;
  /** Set for Activity and ActivityTask so the activity timeline can join. */
  activityId?: string | null;
  projectId?: string | null;
  changes: AuditChanges;
};

export type AuditedMutationActor = {
  id: string;
};

export type AuditedMutationAuditContext<TLoaded, TResult> = {
  loaded: TLoaded;
  result: TResult;
  actor: AuditedMutationActor;
  occurredAt: Date;
};

/**
 * Contract for T11, T13, T14, T15 and T23.
 * `Tx` is `Prisma.TransactionClient` at the infrastructure boundary.
 *
 * `publishRealtime` is reserved for T21 (NOTIFY after COMMIT). The helper accepts
 * the callback so the call site can be typed, but **does not invoke it**.
 */
export type AuditedMutationInput<Tx, TLoaded, TResult> = {
  actor: AuditedMutationActor;
  /**
   * Optimistic lock. Provide together with `versioned`. Omit both on create.
   * The helper runs `UPDATE … SET version = version + 1 WHERE id AND version = expected`.
   * Zero rows → `ConflictError`. `mutate` must not increment `version`.
   */
  expectedVersion?: number;
  versioned?: {
    model: VersionedAggregateModel;
    id: string;
  };
  load: (tx: Tx) => Promise<TLoaded>;
  mutate: (tx: Tx, loaded: TLoaded) => Promise<TResult>;
  audit: (
    context: AuditedMutationAuditContext<TLoaded, TResult>,
  ) => AuditEventWrite | readonly AuditEventWrite[];
  /**
   * T21: call `pg_notify` **after** this function returns (COMMIT succeeded).
   * Persist `RealtimeEvent` inside `mutate` (same transaction). T12 does not call this.
   */
  publishRealtime?: (committed: { result: TResult; occurredAt: Date }) => Promise<void>;
};
