import type { LocalUser } from "@/domain/identity/local-user";
import type { AuditedMutationInput } from "@/application/audit/types";
import {
  runAuditedMutation,
  type AuditedPrismaClient,
} from "@/infrastructure/db/audited-transaction";
import type { Prisma } from "@/generated/prisma/client";
import { mapPrismaCatalogError } from "@/application/catalogs/map-prisma-catalog-error";
import { ConflictError, NotFoundError } from "@/domain/errors";

/**
 * Project writes go through `runAuditedMutation` (docs/audit.md).
 * Unique-name races (P2002) become field errors; stale `version` stays ConflictError.
 */
export async function runProjectAudited<TLoaded, TResult>(
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
        "Este projeto foi atualizado por outra pessoa. Recarregue os dados.",
      );
    }
    if (error instanceof NotFoundError && error.message === "Resource not found") {
      throw new NotFoundError("Projeto não encontrado.");
    }
    mapPrismaCatalogError(error);
  }
}
