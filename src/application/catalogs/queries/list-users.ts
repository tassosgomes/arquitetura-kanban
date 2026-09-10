import type { LocalUser } from "@/domain/identity/local-user";
import type { CatalogUserRepository } from "@/application/ports/catalog-repositories";
import type { CatalogUserItem } from "@/application/catalogs/types";

export async function listUsers(
  _actor: LocalUser,
  users: CatalogUserRepository,
): Promise<CatalogUserItem[]> {
  return users.listAll();
}

export async function listActiveUsers(
  _actor: LocalUser,
  users: CatalogUserRepository,
): Promise<CatalogUserItem[]> {
  return users.listActive();
}
