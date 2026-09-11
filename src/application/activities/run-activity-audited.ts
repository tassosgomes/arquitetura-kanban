import type { LocalUser } from "@/domain/identity/local-user";
import type { Clock } from "@/application/ports/clock";
import type { AuditedMutationInput } from "@/application/audit/types";
import {
  runAuditedMutation,
  type AuditedPrismaClient,
} from "@/infrastructure/db/audited-transaction";
import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError } from "@/domain/errors";

export async function runActivityAudited<TLoaded, TResult>(
  prisma: AuditedPrismaClient,
  actor: LocalUser,
  input: Omit<AuditedMutationInput<Prisma.TransactionClient, TLoaded, TResult>, "actor"> & {
    clock?: Clock;
  },
): Promise<TResult> {
  try {
    return await runAuditedMutation({
      prisma,
      actor: { id: actor.id },
      ...input,
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      throw new ConflictError(
        "Esta atividade foi atualizada por outra pessoa. Recarregue os dados.",
      );
    }
    if (error instanceof NotFoundError && error.message === "Resource not found") {
      throw new NotFoundError("Atividade não encontrada.");
    }
    throw error;
  }
}
