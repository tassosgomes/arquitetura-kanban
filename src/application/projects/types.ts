import type { ArchitectureRole, Nature } from "@/domain/catalog/classifications";
import type { ProjectStatus } from "@/domain/project/project-status";

export type ProjectListFilter = "active" | "cancelled" | "all";

export type ProjectUserRef = {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
};

export type ProjectAreaRef = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ProjectListItem = {
  id: string;
  name: string;
  status: ProjectStatus;
  responsibleArea: ProjectAreaRef;
  updatedAt: Date;
};

export type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  externalResponsible: string | null;
  status: ProjectStatus;
  nature: Nature;
  architectureRole: ArchitectureRole;
  startDate: string | null;
  expectedEndDate: string | null;
  version: number;
  responsibleArea: ProjectAreaRef;
  participants: ProjectUserRef[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; displayName: string | null };
  updatedBy: { id: string; displayName: string | null };
};

export type ProjectWriteData = {
  name: string;
  nameNormalized: string;
  description: string | null;
  responsibleAreaId: string;
  externalResponsible: string | null;
  nature: Nature;
  architectureRole: ArchitectureRole;
  participantIds: string[];
  startDate: string | null;
  expectedEndDate: string | null;
  status: ProjectStatus;
};

/** Prefill da atividade vinculada (decisão 8 / DE-15). Projetos não cancelados. */
export type ProjectInheritanceSnapshot = {
  id: string;
  name: string;
  nature: Nature;
  architectureRole: ArchitectureRole;
  responsibleAreaId: string;
  participantIds: string[];
};
