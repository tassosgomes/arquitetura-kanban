import type { PrismaClient } from "@/generated/prisma/client";
import type { CatalogUserRepository } from "@/application/ports/catalog-repositories";
import { mapCatalogUserItem } from "@/infrastructure/db/repositories/catalog-mappers";

const select = {
  id: true,
  displayName: true,
  email: true,
  isActive: true,
};

export function createPrismaCatalogUserRepository(prisma: PrismaClient): CatalogUserRepository {
  return {
    listAll() {
      return prisma.user
        .findMany({
          select,
          orderBy: [{ isActive: "desc" }, { displayName: "asc" }, { email: "asc" }],
        })
        .then((rows) => rows.map(mapCatalogUserItem));
    },

    listActive() {
      return prisma.user
        .findMany({
          where: { isActive: true },
          select,
          orderBy: [{ displayName: "asc" }, { email: "asc" }],
        })
        .then((rows) => rows.map(mapCatalogUserItem));
    },
  };
}
