import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AreaRepository,
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

export function createPrismaAreaRepository(prisma: PrismaClient): AreaRepository {
  return {
    findById(id) {
      return prisma.area
        .findUnique({ where: { id }, select })
        .then((row) => (row ? mapCatalogItem(row) : null));
    },

    findActiveByNameNormalized(nameNormalized) {
      return prisma.area
        .findFirst({
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

    create(data: CatalogWriteData) {
      return prisma.area
        .create({ data, select })
        .then(mapCatalogItem);
    },

    updateName(id, data: CatalogWriteData) {
      return prisma.area
        .update({ where: { id }, data, select })
        .then(mapCatalogItem);
    },

    deactivate(id) {
      return prisma.area
        .update({ where: { id }, data: { isActive: false }, select })
        .then(mapCatalogItem);
    },
  };
}
