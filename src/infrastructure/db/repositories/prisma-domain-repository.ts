import type { PrismaClient } from "@/generated/prisma/client";
import type {
  CatalogWriteData,
  DomainRepository,
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

export function createPrismaDomainRepository(prisma: PrismaClient): DomainRepository {
  return {
    findById(id) {
      return prisma.architectureDomain
        .findUnique({ where: { id }, select })
        .then((row) => (row ? mapCatalogItem(row) : null));
    },

    findActiveByNameNormalized(nameNormalized) {
      return prisma.architectureDomain
        .findFirst({
          where: { nameNormalized, isActive: true },
          select,
        })
        .then((row) => (row ? mapCatalogItem(row) : null));
    },

    list(filter: CatalogListFilter) {
      return prisma.architectureDomain
        .findMany({
          where: catalogListWhere(filter),
          select,
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
        })
        .then((rows) => rows.map(mapCatalogItem));
    },

    create(data: CatalogWriteData) {
      return prisma.architectureDomain
        .create({ data, select })
        .then(mapCatalogItem);
    },

    updateName(id, data: CatalogWriteData) {
      return prisma.architectureDomain
        .update({ where: { id }, data, select })
        .then(mapCatalogItem);
    },

    deactivate(id) {
      return prisma.architectureDomain
        .update({ where: { id }, data: { isActive: false }, select })
        .then(mapCatalogItem);
    },
  };
}
