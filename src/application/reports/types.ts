import type { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import type { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import type { EffortListFilter } from "@/application/activities/types";
import type { TemporalQuery } from "@/application/temporal";
import type { Instant } from "@/application/temporal";

export const MANAGEMENT_INDICATOR_IDS = [
  "I-01",
  "I-02",
  "I-03",
  "I-04",
  "I-05",
  "I-06",
  "I-07",
  "I-09",
] as const;

export type ManagementIndicatorId = (typeof MANAGEMENT_INDICATOR_IDS)[number];

export const MANAGEMENT_DISTRIBUTION_IDS = [
  "D-AREA",
  "D-DOMINIO",
  "D-RESPONSAVEL",
  "D-NATUREZA",
  "D-TIPO",
  "D-PAPEL",
  "D-ESFORCO",
] as const;

export type ManagementDistributionId = (typeof MANAGEMENT_DISTRIBUTION_IDS)[number];

export type ManagementIndicators = Record<ManagementIndicatorId, number>;

export type ManagementDistributionBucket = {
  key: string;
  label: string;
  count: number;
};

export type ManagementDistributions = Record<
  ManagementDistributionId,
  ManagementDistributionBucket[]
>;

/**
 * Historical dimension filters (DE-17). Applied to the reconstructed portrait,
 * never to current Kanban columns.
 */
export type ManagementDimensionFilters = {
  areaId?: string;
  projectId?: string;
  ownerId?: string;
  participantId?: string;
  domainId?: string;
  nature?: Nature;
  priority?: Priority;
  architectureRole?: ArchitectureRole;
  effort?: EffortListFilter;
  status?: ActivityStatus;
  type?: ActivityType;
};

export type ManagementQuery = {
  temporal: TemporalQuery;
  filters?: ManagementDimensionFilters;
};

export type ManagementSnapshot = {
  indicators: ManagementIndicators;
  distributions: ManagementDistributions;
  populationIds: string[];
  fechamento: Instant;
  canonicalAreaNote: string;
};

export type ManagementLabelMaps = {
  areas: ReadonlyMap<string, string>;
  domains: ReadonlyMap<string, string>;
  users: ReadonlyMap<string, string>;
  projects: ReadonlyMap<string, string>;
};
