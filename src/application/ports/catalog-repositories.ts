import type { CatalogItem, CatalogListFilter, CatalogUserItem } from "@/application/catalogs/types";

export type CatalogWriteData = {
  name: string;
  nameNormalized: string;
};

export interface AreaRepository {
  findById(id: string): Promise<CatalogItem | null>;
  findActiveByNameNormalized(nameNormalized: string): Promise<CatalogItem | null>;
  list(filter: CatalogListFilter): Promise<CatalogItem[]>;
  create(data: CatalogWriteData): Promise<CatalogItem>;
  updateName(id: string, data: CatalogWriteData): Promise<CatalogItem>;
  deactivate(id: string): Promise<CatalogItem>;
}

export interface DomainRepository {
  findById(id: string): Promise<CatalogItem | null>;
  findActiveByNameNormalized(nameNormalized: string): Promise<CatalogItem | null>;
  list(filter: CatalogListFilter): Promise<CatalogItem[]>;
  create(data: CatalogWriteData): Promise<CatalogItem>;
  updateName(id: string, data: CatalogWriteData): Promise<CatalogItem>;
  deactivate(id: string): Promise<CatalogItem>;
}

export interface CatalogUserRepository {
  listAll(): Promise<CatalogUserItem[]>;
  listActive(): Promise<CatalogUserItem[]>;
}
