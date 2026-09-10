import type { LocalUser } from "@/domain/identity/local-user";
import type { DomainRepository } from "@/application/ports/catalog-repositories";
import type { CatalogItem, CatalogListFilter } from "@/application/catalogs/types";

export async function listDomains(
  _actor: LocalUser,
  filter: CatalogListFilter,
  domains: DomainRepository,
): Promise<CatalogItem[]> {
  return domains.list(filter);
}

export async function listActiveDomains(
  _actor: LocalUser,
  domains: DomainRepository,
): Promise<CatalogItem[]> {
  return domains.list("active");
}
