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

export type AuditedPrismaClient = {
  $transaction: PrismaClient["$transaction"];
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
 * Shared transactional mutation: optimistic lock + `AuditEvent` insert.
 *
 * ```ts
 * await runAuditedMutation({ actor, expectedVersion, load, mutate, audit })
 * ```
 *
 * `publishRealtime` is part of the contract for T21 and is **not** invoked here.
 * Insert `RealtimeEvent` inside `mutate` when T21 exists; `NOTIFY` only after this
 * function resolves (COMMIT). Do not implement LISTEN/NOTIFY in T12.
 *
 * Application flow never updates or deletes `AuditEvent` — this helper only INSERTs.
 */
export async function runAuditedMutation<TLoaded, TResult>(
  input: RunAuditedMutationInput<TLoaded, TResult>,
): Promise<TResult> {
  const { actor, expectedVersion, versioned, load, mutate, audit, prisma, clock = systemClock } =
    input;

  if ((expectedVersion === undefined) !== (versioned === undefined)) {
    throw new InvariantError("expectedVersion and versioned must be provided together.");
  }

  const occurredAt = clock.now();

  try {
    return await prisma.$transaction(async (tx) => {
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
      return result;
    }, TRANSACTION_OPTIONS);
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }
    throw new InfrastructureError("Could not complete the audited mutation.", error);
  }
}
