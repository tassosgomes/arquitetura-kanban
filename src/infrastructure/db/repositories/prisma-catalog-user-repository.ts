import type { PrismaClient } from "@/generated/prisma/client";
import type { CatalogTx, CatalogUserRepository } from "@/application/ports/catalog-repositories";
import { mapCatalogUserItem } from "@/infrastructure/db/repositories/catalog-mappers";

const select = {
  id: true,
  displayName: true,
  email: true,
  isActive: true,
};

function client(prisma: PrismaClient, tx?: CatalogTx) {
  return tx ?? prisma;
}

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

    findById(id, tx) {
      return client(prisma, tx)
        .user.findUnique({ where: { id }, select })
        .then((row) => (row ? mapCatalogUserItem(row) : null));
    },

    findByIds(ids, tx) {
      if (ids.length === 0) {
        return Promise.resolve([]);
      }

      return client(prisma, tx)
        .user.findMany({
          where: { id: { in: [...ids] } },
          select,
        })
        .then((rows) => rows.map(mapCatalogUserItem));
    },
  };
}
