import type { LocalUser } from "@/domain/identity/local-user";
import type { AuditedMutationInput } from "@/application/audit/types";
import {
  runAuditedMutation,
  type AuditedPrismaClient,
} from "@/infrastructure/db/audited-transaction";
import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError } from "@/domain/errors";

export async function runValueDeliveryAudited<TLoaded, TResult>(
  prisma: AuditedPrismaClient,
  actor: LocalUser,
  input: Omit<AuditedMutationInput<Prisma.TransactionClient, TLoaded, TResult>, "actor">,
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
        "Esta entrega foi atualizada por outra pessoa. Recarregue os dados.",
      );
    }
    if (error instanceof NotFoundError && error.message === "Resource not found") {
      throw new NotFoundError("Entrega de valor não encontrada.");
    }
    throw error;
  }
}
