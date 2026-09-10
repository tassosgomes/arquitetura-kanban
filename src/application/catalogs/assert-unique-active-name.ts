import { ValidationError } from "@/domain/errors";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { CatalogItem } from "@/application/catalogs/types";

const DUPLICATE_NAME_MESSAGE = "Já existe um registro ativo com este nome.";

export function assertUniqueActiveName(
  name: string,
  existing: CatalogItem | null,
  excludeId?: string,
): void {
  if (!existing) {
    return;
  }

  if (excludeId && existing.id === excludeId) {
    return;
  }

  throw new ValidationError("Nome já em uso por um registro ativo.", {
    name: [DUPLICATE_NAME_MESSAGE],
  });
}

export function normalizedCatalogName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ValidationError("Informe um nome.", {
      name: ["Informe um nome."],
    });
  }

  return normalizeCatalogName(trimmed);
}
