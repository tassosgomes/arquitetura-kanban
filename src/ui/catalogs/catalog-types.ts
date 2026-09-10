export type CatalogItemDto = {
  id: string;
  name: string;
  isActive: boolean;
};

export type CatalogUserDto = {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
};
