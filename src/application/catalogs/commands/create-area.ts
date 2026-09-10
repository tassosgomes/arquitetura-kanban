import type { LocalUser } from "@/domain/identity/local-user";
import type { AreaRepository } from "@/application/ports/catalog-repositories";
import type { CatalogItem } from "@/application/catalogs/types";
import {
  assertUniqueActiveName,
  normalizedCatalogName,
} from "@/application/catalogs/assert-unique-active-name";
import { mapPrismaCatalogError } from "@/application/catalogs/map-prisma-catalog-error";
import { NotFoundError } from "@/domain/errors";

export type CreateAreaInput = {
  name: string;
};

export async function createArea(
  _actor: LocalUser,
  input: CreateAreaInput,
  areas: AreaRepository,
): Promise<CatalogItem> {
  const trimmed = input.name.trim();
  const nameNormalized = normalizedCatalogName(trimmed);

  const duplicate = await areas.findActiveByNameNormalized(nameNormalized);
  assertUniqueActiveName(trimmed, duplicate);

  try {
    // T12: wrap with audited transaction
    return await areas.create({ name: trimmed, nameNormalized });
  } catch (error) {
    mapPrismaCatalogError(error);
  }
}

export async function renameArea(
  _actor: LocalUser,
  input: { id: string; name: string },
  areas: AreaRepository,
): Promise<CatalogItem> {
  const existing = await areas.findById(input.id);
  if (!existing) {
    throw new NotFoundError("Área não encontrada.");
  }

  const trimmed = input.name.trim();
  const nameNormalized = normalizedCatalogName(trimmed);
  const duplicate = await areas.findActiveByNameNormalized(nameNormalized);
  assertUniqueActiveName(trimmed, duplicate, input.id);

  try {
    // T12: wrap with audited transaction
    return await areas.updateName(input.id, { name: trimmed, nameNormalized });
  } catch (error) {
    mapPrismaCatalogError(error);
  }
}

export async function deactivateArea(
  _actor: LocalUser,
  input: { id: string },
  areas: AreaRepository,
): Promise<CatalogItem> {
  const existing = await areas.findById(input.id);
  if (!existing) {
    throw new NotFoundError("Área não encontrada.");
  }

  if (!existing.isActive) {
    return existing;
  }

  // T12: wrap with audited transaction
  return areas.deactivate(input.id);
}
