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
  loadManagementPopulation,
  type LoadedManagementPopulation,
  type ManagementSnapshotDeps,
} from "@/application/reports/compute-management-snapshot";
export {
  MANAGEMENT_DISTRIBUTION_LABELS,
  MANAGEMENT_INDICATOR_HINTS,
  MANAGEMENT_INDICATOR_LABELS,
} from "@/application/reports/labels";
export {
  DEFAULT_MANAGEMENT_FILTER_VALUES,
  DEFAULT_MANAGEMENT_PERIOD,
  MANAGEMENT_PERIOD_LABELS,
  MANAGEMENT_PERIOD_OPTIONS,
  MANAGEMENT_SHORTCUTS,
  ManagementPeriodOption,
  ManagementShortcut,
  activeManagementShortcut,
  hasActiveManagementFilters,
  hasDimensionFilters,
  managementHref,
  parseManagementSearchParams,
  parsePageParam,
  reportsCsvHref,
  serializeManagementFilterValues,
  serializeManagementQuery,
  toManagementDimensionFilters,
  toManagementQuery,
  toTemporalQuery,
} from "@/application/reports/search-params";
export type {
  ManagementFilterValues,
  ManagementSearchParams,
  ParsedManagementSearchParams,
} from "@/application/reports/search-params";
export {
  describeManagementPeriod,
  formatCivilDatePtBr as formatManagementCivilDatePtBr,
  formatInstantPtBr,
  isFechamentoCappedToNow,
} from "@/application/reports/period-view";
export type { ManagementPeriodView } from "@/application/reports/period-view";
export {
  buildManagementReport,
  type ManagementReport,
} from "@/application/reports/build-management-report";
export {
  REPORT_CSV_HEADERS,
  collectAssociatedProjects,
  managementReportCsvRecords,
  reportRowToCsvCells,
  toManagementReportRow,
  type AssociatedProject,
  type ManagementReportRow,
} from "@/application/reports/report-rows";
export { REPORT_PAGE_SIZE, paginateItems } from "@/application/reports/pagination";
export type { PageSlice } from "@/application/reports/pagination";
export {
  buildExecutiveBook,
  type ExecutiveBook,
  type ExecutiveBookActivity,
  type ExecutiveBookArea,
  type ExecutiveBookDeadlineSummary,
  type ExecutiveBookDeps,
  type ExecutiveBookStatusSummary,
} from "@/application/reports/executive-book";
