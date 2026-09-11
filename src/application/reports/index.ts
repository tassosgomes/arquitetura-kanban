export type {
  ManagementDimensionFilters,
  ManagementDistributionBucket,
  ManagementDistributionId,
  ManagementDistributions,
  ManagementIndicatorId,
  ManagementIndicators,
  ManagementLabelMaps,
  ManagementQuery,
  ManagementSnapshot,
} from "@/application/reports/types";
export {
  MANAGEMENT_DISTRIBUTION_IDS,
  MANAGEMENT_INDICATOR_IDS,
} from "@/application/reports/types";
export { CANONICAL_AREA_NOTE } from "@/application/reports/canonical-notes";
export { EFFORT_UNSET_LABEL, aggregateManagementSnapshot, distinctPopulation } from "@/application/reports/aggregate";
export type { ManagementPopulationRow } from "@/application/reports/aggregate";
export { matchesManagementFilters } from "@/application/reports/filters";
export {
  computeManagementSnapshot,
  type ManagementSnapshotDeps,
} from "@/application/reports/compute-management-snapshot";
