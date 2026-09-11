import type { LocalUser } from "@/domain/identity/local-user";
import type { DomainRepository } from "@/application/ports/catalog-repositories";
import type { CatalogItem } from "@/application/catalogs/types";
import {
  assertUniqueActiveName,
  normalizedCatalogName,
} from "@/application/catalogs/assert-unique-active-name";
import { runCatalogAudited } from "@/application/catalogs/run-catalog-audited";
import type { AuditedPrismaClient } from "@/infrastructure/db/audited-transaction";
import {
  AuditAction,
  AuditEntityKind,
  buildCreatedChanges,
  buildUpdatedChanges,
  CATALOG_AUDIT_FIELDS,
  catalogAuditSnapshot,
} from "@/application/audit";
import { NotFoundError } from "@/domain/errors";

export type CreateDomainInput = {
  name: string;
};

export async function createDomain(
  actor: LocalUser,
  input: CreateDomainInput,
  domains: DomainRepository,
  prisma: AuditedPrismaClient,
): Promise<CatalogItem> {
  const trimmed = input.name.trim();
  const nameNormalized = normalizedCatalogName(trimmed);

  return runCatalogAudited(prisma, actor, {
    load: async (tx) => {
      const duplicate = await domains.findActiveByNameNormalized(nameNormalized, tx);
      assertUniqueActiveName(trimmed, duplicate);
      return null;
    },
    mutate: (tx) => domains.create({ name: trimmed, nameNormalized }, tx),
    audit: ({ result }) => ({
      entityKind: AuditEntityKind.Domain,
      entityId: result.id,
      action: AuditAction.created,
      changes: buildCreatedChanges(catalogAuditSnapshot(result)),
    }),
  });
}

export async function renameDomain(
  actor: LocalUser,
  input: { id: string; name: string },
  domains: DomainRepository,
  prisma: AuditedPrismaClient,
): Promise<CatalogItem> {
  const trimmed = input.name.trim();
  const nameNormalized = normalizedCatalogName(trimmed);

  return runCatalogAudited(prisma, actor, {
    load: async (tx) => {
      const existing = await domains.findById(input.id, tx);
      if (!existing) {
        throw new NotFoundError("Domínio não encontrado.");
      }
      const duplicate = await domains.findActiveByNameNormalized(nameNormalized, tx);
      assertUniqueActiveName(trimmed, duplicate, input.id);
      return existing;
    },
    mutate: (tx) => domains.updateName(input.id, { name: trimmed, nameNormalized }, tx),
    audit: ({ loaded, result }) => ({
      entityKind: AuditEntityKind.Domain,
      entityId: result.id,
      action: AuditAction.field_changed,
      changes: buildUpdatedChanges(
        catalogAuditSnapshot(loaded),
        catalogAuditSnapshot(result),
        CATALOG_AUDIT_FIELDS,
      ),
    }),
  });
}

export async function deactivateDomain(
  actor: LocalUser,
  input: { id: string },
  domains: DomainRepository,
  prisma: AuditedPrismaClient,
): Promise<CatalogItem> {
  const existing = await domains.findById(input.id);
  if (!existing) {
    throw new NotFoundError("Domínio não encontrado.");
  }

  if (!existing.isActive) {
    return existing;
  }

  return runCatalogAudited(prisma, actor, {
    load: async (tx) => {
      const row = await domains.findById(input.id, tx);
      if (!row) {
        throw new NotFoundError("Domínio não encontrado.");
      }
      return row;
    },
    mutate: async (tx, loaded) => {
      if (!loaded.isActive) {
        return loaded;
      }
      return domains.deactivate(input.id, tx);
    },
    audit: ({ loaded, result }) => ({
      entityKind: AuditEntityKind.Domain,
      entityId: result.id,
      action: AuditAction.deactivated,
      changes: buildUpdatedChanges(
        catalogAuditSnapshot(loaded),
        catalogAuditSnapshot(result),
        CATALOG_AUDIT_FIELDS,
      ),
    }),
  });
}
