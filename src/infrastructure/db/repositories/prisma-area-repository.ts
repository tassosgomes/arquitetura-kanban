import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AreaRepository,
  CatalogTx,
  CatalogWriteData,
} from "@/application/ports/catalog-repositories";
import type { CatalogListFilter } from "@/application/catalogs/types";
import {
  catalogListWhere,
  mapCatalogItem,
} from "@/infrastructure/db/repositories/catalog-mappers";

const select = {
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

function client(prisma: PrismaClient, tx?: CatalogTx) {
  return tx ?? prisma;
}

export function createPrismaAreaRepository(prisma: PrismaClient): AreaRepository {
  return {
    findById(id, tx) {
      return client(prisma, tx)
        .area.findUnique({ where: { id }, select })
        .then((row) => (row ? mapCatalogItem(row) : null));
    },

    findActiveByNameNormalized(nameNormalized, tx) {
      return client(prisma, tx)
        .area.findFirst({
          where: { nameNormalized, isActive: true },
          select,
        })
        .then((row) => (row ? mapCatalogItem(row) : null));
    },

    list(filter: CatalogListFilter) {
      return prisma.area
        .findMany({
          where: catalogListWhere(filter),
          select,
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
        })
        .then((rows) => rows.map(mapCatalogItem));
    },

    create(data: CatalogWriteData, tx) {
      return client(prisma, tx).area.create({ data, select }).then(mapCatalogItem);
    },

    updateName(id, data: CatalogWriteData, tx) {
      return client(prisma, tx)
        .area.update({ where: { id }, data, select })
        .then(mapCatalogItem);
    },

    deactivate(id, tx) {
      return client(prisma, tx)
        .area.update({ where: { id }, data: { isActive: false }, select })
        .then(mapCatalogItem);
    },
  };
}
