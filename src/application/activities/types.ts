import type { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import type { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";

export type ActivityUserRef = {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
};

export type ActivityAreaRef = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ActivityDomainRef = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ActivityProjectRef = {
  id: string;
  name: string;
  status: string;
};

export type ActivityListFilter = {
  projectId?: string;
  includeCancelled?: boolean;
};

export type ActivityListItem = {
  id: string;
  title: string;
  type: ActivityType;
  status: ActivityStatus;
  priority: Priority;
  project: ActivityProjectRef | null;
  requestingArea: ActivityAreaRef;
  owner: ActivityUserRef;
  updatedAt: Date;
};

export type ActivityTaskRecord = {
  id: string;
  description: string;
  isDone: boolean;
  sortOrder: number;
};

/** Result of checklist mutations (T15). Status is included so tests can assert RN-20. */
export type ActivityChecklistResult = {
  id: string;
  version: number;
  status: ActivityStatus;
  projectId: string | null;
  tasks: ActivityTaskRecord[];
};

export type ActivityRecord = {
  id: string;
  title: string;
  description: string | null;
  observations: string | null;
  type: ActivityType;
  status: ActivityStatus;
  nature: Nature;
  architectureRole: ArchitectureRole;
  priority: Priority;
  effort: Effort | null;
  startDate: string | null;
  expectedEndDate: string | null;
  completedDate: string | null;
  cancelledDate: string | null;
  version: number;
  project: ActivityProjectRef | null;
  requestingArea: ActivityAreaRef;
  domain: ActivityDomainRef;
  owner: ActivityUserRef;
  participants: ActivityUserRef[];
  involvedAreas: ActivityAreaRef[];
  tasks: ActivityTaskRecord[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; displayName: string | null };
  updatedBy: { id: string; displayName: string | null };
};

export type ActivityWriteData = {
  title: string;
  description: string | null;
  observations: string | null;
  type: ActivityType;
  projectId: string | null;
  requestingAreaId: string;
  domainId: string;
  nature: Nature;
  architectureRole: ArchitectureRole;
  ownerId: string;
  participantIds: string[];
  involvedAreaIds: string[];
  priority: Priority;
  effort: Effort | null;
  status: ActivityStatus;
  startDate: string | null;
  expectedEndDate: string | null;
  completedDate: string | null;
};

export type ActivityProjectDefaults = {
  projectId: string;
  ownerId: string;
  participantIds: string[];
  nature: Nature;
  architectureRole: ArchitectureRole;
  requestingAreaId: string;
};
