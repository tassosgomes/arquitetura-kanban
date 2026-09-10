import type { LocalUser } from "@/domain/identity/local-user";
import type { DomainRepository } from "@/application/ports/catalog-repositories";
import type { CatalogItem } from "@/application/catalogs/types";
import {
  assertUniqueActiveName,
  normalizedCatalogName,
} from "@/application/catalogs/assert-unique-active-name";
import { mapPrismaCatalogError } from "@/application/catalogs/map-prisma-catalog-error";
import { NotFoundError } from "@/domain/errors";

export type CreateDomainInput = {
  name: string;
};

export async function createDomain(
  _actor: LocalUser,
  input: CreateDomainInput,
  domains: DomainRepository,
): Promise<CatalogItem> {
  const trimmed = input.name.trim();
  const nameNormalized = normalizedCatalogName(trimmed);

  const duplicate = await domains.findActiveByNameNormalized(nameNormalized);
  assertUniqueActiveName(trimmed, duplicate);

  try {
    // T12: wrap with audited transaction
    return await domains.create({ name: trimmed, nameNormalized });
  } catch (error) {
    mapPrismaCatalogError(error);
  }
}

export async function renameDomain(
  _actor: LocalUser,
  input: { id: string; name: string },
  domains: DomainRepository,
): Promise<CatalogItem> {
  const existing = await domains.findById(input.id);
  if (!existing) {
    throw new NotFoundError("Domínio não encontrado.");
  }

  const trimmed = input.name.trim();
  const nameNormalized = normalizedCatalogName(trimmed);
  const duplicate = await domains.findActiveByNameNormalized(nameNormalized);
  assertUniqueActiveName(trimmed, duplicate, input.id);

  try {
    // T12: wrap with audited transaction
    return await domains.updateName(input.id, { name: trimmed, nameNormalized });
  } catch (error) {
    mapPrismaCatalogError(error);
  }
}

export async function deactivateDomain(
  _actor: LocalUser,
  input: { id: string },
  domains: DomainRepository,
): Promise<CatalogItem> {
  const existing = await domains.findById(input.id);
  if (!existing) {
    throw new NotFoundError("Domínio não encontrado.");
  }

  if (!existing.isActive) {
    return existing;
  }

  // T12: wrap with audited transaction
  return domains.deactivate(input.id);
}
