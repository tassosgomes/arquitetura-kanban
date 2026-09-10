export type CatalogItem = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CatalogUserItem = {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
};

export type CatalogListFilter = "active" | "inactive" | "all";
