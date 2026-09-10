import type { LocalUser } from "@/domain/identity/local-user";
import type { AreaRepository } from "@/application/ports/catalog-repositories";
import type { CatalogItem, CatalogListFilter } from "@/application/catalogs/types";

export async function listAreas(
  _actor: LocalUser,
  filter: CatalogListFilter,
  areas: AreaRepository,
): Promise<CatalogItem[]> {
  return areas.list(filter);
}

export async function listActiveAreas(
  _actor: LocalUser,
  areas: AreaRepository,
): Promise<CatalogItem[]> {
  return areas.list("active");
}
