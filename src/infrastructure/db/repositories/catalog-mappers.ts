import type { CatalogItem, CatalogListFilter, CatalogUserItem } from "@/application/catalogs/types";

type AreaRow = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type DomainRow = AreaRow;

type UserRow = {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
};

export function mapCatalogItem(row: AreaRow | DomainRow): CatalogItem {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapCatalogUserItem(row: UserRow): CatalogUserItem {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    isActive: row.isActive,
  };
}

export function catalogListWhere(filter: CatalogListFilter): { isActive?: boolean } {
  switch (filter) {
    case "active":
      return { isActive: true };
    case "inactive":
      return { isActive: false };
    case "all":
      return {};
  }
}
