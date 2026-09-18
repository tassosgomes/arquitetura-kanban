import type { ActivityProjectDefaults } from "@/application/activities";

export type CatalogOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ActivitySelectionOption = {
  id: string;
  label: string;
  searchText?: string;
  isActive: boolean;
};

export type ActivityUserOption = {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
};

export type ActivityProjectOption = {
  id: string;
  name: string;
  defaults: ActivityProjectDefaults;
};

export type ActivityFormValues = {
  id?: string;
  version?: number;
  title: string;
  description: string;
  observations: string;
  type: string;
  projectId: string;
  requestingAreaId: string;
  domainId: string;
  nature: string;
  architectureRole: string;
  ownerId: string;
  participantIds: string[];
  involvedAreaIds: string[];
  priority: string;
  effort: string;
  status: string;
  startDate: string;
  expectedEndDate: string;
  completedDate: string;
};
