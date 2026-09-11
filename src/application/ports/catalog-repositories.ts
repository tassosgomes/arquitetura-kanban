import type { Prisma } from "@/generated/prisma/client";
import type { CatalogItem, CatalogListFilter, CatalogUserItem } from "@/application/catalogs/types";

/** Optional write-path client so uniqueness + mutate share the audited transaction. */
export type CatalogTx = Prisma.TransactionClient;

export type CatalogWriteData = {
  name: string;
  nameNormalized: string;
};

export interface AreaRepository {
  findById(id: string, tx?: CatalogTx): Promise<CatalogItem | null>;
  findActiveByNameNormalized(nameNormalized: string, tx?: CatalogTx): Promise<CatalogItem | null>;
  list(filter: CatalogListFilter): Promise<CatalogItem[]>;
  create(data: CatalogWriteData, tx?: CatalogTx): Promise<CatalogItem>;
  updateName(id: string, data: CatalogWriteData, tx?: CatalogTx): Promise<CatalogItem>;
  deactivate(id: string, tx?: CatalogTx): Promise<CatalogItem>;
}

export interface DomainRepository {
  findById(id: string, tx?: CatalogTx): Promise<CatalogItem | null>;
  findActiveByNameNormalized(nameNormalized: string, tx?: CatalogTx): Promise<CatalogItem | null>;
  list(filter: CatalogListFilter): Promise<CatalogItem[]>;
  create(data: CatalogWriteData, tx?: CatalogTx): Promise<CatalogItem>;
  updateName(id: string, data: CatalogWriteData, tx?: CatalogTx): Promise<CatalogItem>;
  deactivate(id: string, tx?: CatalogTx): Promise<CatalogItem>;
}

export interface CatalogUserRepository {
  listAll(): Promise<CatalogUserItem[]>;
  listActive(): Promise<CatalogUserItem[]>;
  findById(id: string, tx?: CatalogTx): Promise<CatalogUserItem | null>;
  findByIds(ids: readonly string[], tx?: CatalogTx): Promise<CatalogUserItem[]>;
}
