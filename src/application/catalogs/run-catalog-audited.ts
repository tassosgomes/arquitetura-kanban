import type { LocalUser } from "@/domain/identity/local-user";
import type { AuditedMutationInput } from "@/application/audit/types";
import {
  runAuditedMutation,
  type AuditedPrismaClient,
} from "@/infrastructure/db/audited-transaction";
import type { Prisma } from "@/generated/prisma/client";
import { mapPrismaCatalogError } from "@/application/catalogs/map-prisma-catalog-error";

/**
 * Catalog writes (Area / Domain) have no `version`. Uniqueness is checked in `load`
 * on the same `tx` that `mutate` uses.
 */
export async function runCatalogAudited<TLoaded, TResult>(
  prisma: AuditedPrismaClient,
  actor: LocalUser,
  input: Omit<
    AuditedMutationInput<Prisma.TransactionClient, TLoaded, TResult>,
    "actor" | "expectedVersion" | "versioned"
  >,
): Promise<TResult> {
  try {
    return await runAuditedMutation({
      prisma,
      actor: { id: actor.id },
      ...input,
    });
  } catch (error) {
    mapPrismaCatalogError(error);
  }
}
