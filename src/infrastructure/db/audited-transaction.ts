import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { Clock } from "@/application/ports/clock";
import { systemClock } from "@/application/ports/clock";
import type {
  AuditEventWrite,
  AuditedMutationInput,
  VersionedAggregateModel,
} from "@/application/audit/types";
import { ApplicationError, ConflictError, InvariantError, NotFoundError } from "@/domain/errors";
import { InfrastructureError } from "@/infrastructure/errors";
import { defaultNotifyRealtime } from "@/infrastructure/realtime/notify";
import { insertRealtimeEvents } from "@/infrastructure/realtime/persist";

export type AuditedPrismaClient = {
  $transaction: PrismaClient["$transaction"];
  /** Batch adapters defer notification until their outer transaction commits. */
  notifyRealtime?: (ids: readonly bigint[]) => Promise<void>;
};

export type RunAuditedMutationInput<TLoaded, TResult> = AuditedMutationInput<
  Prisma.TransactionClient,
  TLoaded,
  TResult
> & {
  prisma: AuditedPrismaClient;
  clock?: Clock;
};

export type RunAuditedMutation = <TLoaded, TResult>(
  input: RunAuditedMutationInput<TLoaded, TResult>,
) => Promise<TResult>;

const TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 15_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

function asAuditWrites(
  write: AuditEventWrite | readonly AuditEventWrite[],
): AuditEventWrite[] {
  if ("entityKind" in write) {
    return [write];
  }
  return [...write];
}

export async function incrementVersionOrConflict(
  tx: Prisma.TransactionClient,
  model: VersionedAggregateModel,
  id: string,
  expectedVersion: number,
): Promise<void> {
  const where = { id, version: expectedVersion };
  const data = { version: { increment: 1 as const } };

  let count: number;
  switch (model) {
    case "project":
      count = (await tx.project.updateMany({ where, data })).count;
      break;
    case "activity":
      count = (await tx.activity.updateMany({ where, data })).count;
      break;
    case "valueDelivery":
      count = (await tx.valueDelivery.updateMany({ where, data })).count;
      break;
    default: {
      const exhaustive: never = model;
      throw new InvariantError(`Unsupported versioned model: ${String(exhaustive)}`);
    }
  }

  if (count === 0) {
    throw new ConflictError();
  }
}

async function insertAuditEvents(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  occurredAt: Date,
  writes: readonly AuditEventWrite[],
): Promise<void> {
  for (const event of writes) {
    await tx.auditEvent.create({
      data: {
        actorUserId,
        occurredAt,
        entityKind: event.entityKind,
        entityId: event.entityId,
        action: event.action,
        activityId: event.activityId ?? null,
        projectId: event.projectId ?? null,
        changes: event.changes as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * Shared transactional mutation: optimistic lock + `AuditEvent` + `RealtimeEvent`.
 *
 * ```ts
 * await runAuditedMutation({ actor, expectedVersion, load, mutate, audit })
 * ```
 *
 * `RealtimeEvent` is inserted in the same `$transaction` (type derived from audit
 * entityKind/action). `NOTIFY realtime` runs only after COMMIT, with the decimal id.
 * A rolled-back transaction neither leaves a row nor notifies. Duplicate SSE frames
 * with the same id are tolerated by clients.
 *
 * Application flow never updates or deletes `AuditEvent` — this helper only INSERTs.
 */
export async function runAuditedMutation<TLoaded, TResult>(
  input: RunAuditedMutationInput<TLoaded, TResult>,
): Promise<TResult> {
  const {
    actor,
    expectedVersion,
    versioned,
    load,
    mutate,
    audit,
    prisma,
    clock = systemClock,
    publishRealtime,
    notifyRealtime = prisma.notifyRealtime ?? defaultNotifyRealtime,
  } = input;

  if ((expectedVersion === undefined) !== (versioned === undefined)) {
    throw new InvariantError("expectedVersion and versioned must be provided together.");
  }

  const occurredAt = clock.now();

  try {
    const { result, realtimeIds } = await prisma.$transaction(async (tx) => {
      const loaded = await load(tx);

      if (versioned && (loaded === null || loaded === undefined)) {
        throw new NotFoundError();
      }

      if (versioned && expectedVersion !== undefined) {
        await incrementVersionOrConflict(tx, versioned.model, versioned.id, expectedVersion);
      }

      const result = await mutate(tx, loaded);
      const writes = asAuditWrites(
        audit({ loaded, result, actor, occurredAt }),
      );

      if (writes.length === 0) {
        throw new InvariantError("Auditable mutations must persist at least one AuditEvent.");
      }

      await insertAuditEvents(tx, actor.id, occurredAt, writes);
      const realtimeIds = await insertRealtimeEvents(tx, writes);
      return { result, realtimeIds };
    }, TRANSACTION_OPTIONS);

    try {
      await notifyRealtime(realtimeIds);
    } catch (error) {
      console.error("Realtime NOTIFY failed after commit", error);
    }

    if (publishRealtime) {
      try {
        await publishRealtime({ result, occurredAt });
      } catch (error) {
        console.error("publishRealtime hook failed after commit", error);
      }
    }

    return result;
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }
    throw new InfrastructureError("Could not complete the audited mutation.", error);
  }
}
