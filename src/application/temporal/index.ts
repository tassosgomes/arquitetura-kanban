export type { CivilDate } from "@/domain/calendar/civil-date";
export type { ActivityExecutionInput, InclusiveInterval } from "@/domain/calendar/execution-interval";
export {
  belongsToPeriod,
  executionInterval,
  intersects,
  isUnplanned,
} from "@/domain/calendar/execution-interval";
export type { CustomPeriod, Instant, PeriodSpec, ResolvedPeriod } from "@/infrastructure/calendar/period";
export {
  PERIOD_PRESETS,
  PeriodPreset,
  fechamentoExclusivo,
  isBeforeFechamento,
  isCustomPeriod,
  isPeriodPreset,
  resolvePeriod,
  startOfCivilDay,
  todayInAppTimeZone,
} from "@/infrastructure/calendar/period";
export { filterByPeriod, resolveTemporalQuery, TemporalQueryMode } from "@/application/temporal/query";
export type { ResolvedTemporalQuery, TemporalQuery } from "@/application/temporal/query";
