export type ValueDeliveryAuthorRef = {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
};

export type ValueDeliveryListItem = {
  id: string;
  projectId: string;
  title: string;
  referenceDate: string;
  author: ValueDeliveryAuthorRef;
  createdAt: Date;
  updatedAt: Date;
};

export type ValueDeliveryRecord = {
  id: string;
  projectId: string;
  title: string;
  contentMarkdown: string;
  referenceDate: string;
  version: number;
  author: ValueDeliveryAuthorRef;
  createdAt: Date;
  updatedAt: Date;
};

export type ValueDeliveryWriteData = {
  title: string;
  contentMarkdown: string;
  referenceDate: string;
};

export type ValueDeliveryCreateData = ValueDeliveryWriteData & {
  projectId: string;
};
