import { ActivityStatus } from "@/domain/activity/enums";
import type { CivilDate } from "@/domain/calendar/civil-date";

/**
 * Inclusive civil-day range in America/Sao_Paulo (domain-rules.md §4.4, §6).
 * ISO `YYYY-MM-DD` strings compare in calendar order.
 */
export type InclusiveInterval = {
  start: CivilDate;
  end: CivilDate;
};

/**
 * Current dates that determine the execution interval. `expectedEndDate`
 * (previsão) is not a field: it never closes or extends execution.
 */
export type ActivityExecutionInput = {
  startDate: CivilDate | null;
  status: ActivityStatus;
  completedDate?: CivilDate | null;
  cancelledDate?: CivilDate | null;
};

/** Sem planejamento: `dataInicio` nulo (DE-16). Includes Concluído/Cancelado. */
export function isUnplanned(activity: Pick<ActivityExecutionInput, "startDate">): boolean {
  return activity.startDate == null;
}

/**
 * Intervalo de execução `[dataInicio, dataFimEfetiva]` or null (domain-rules.md §6).
 *
 * No start → null (outside any execution cut). Effective end: cancelamento |
 * conclusão | `today`. If `today < dataInicio` (DE-11) or the end is missing,
 * the interval is null. Days are inclusive.
 */
export function executionInterval(
  activity: ActivityExecutionInput,
  today: CivilDate,
): InclusiveInterval | null {
  const start = activity.startDate;
  if (start == null) {
    return null;
  }

  const end = effectiveEndDate(activity, today);
  if (end == null || end < start) {
    return null;
  }

  return { start, end };
}

function effectiveEndDate(activity: ActivityExecutionInput, today: CivilDate): CivilDate | null {
  if (activity.status === ActivityStatus.CANCELLED) {
    return activity.cancelledDate ?? null;
  }
  if (activity.status === ActivityStatus.DONE) {
    return activity.completedDate ?? null;
  }
  return today;
}

/** `inicio <= pFim AND fim >= pInicio` (inclusive days). */
export function intersects(interval: InclusiveInterval, period: InclusiveInterval): boolean {
  return interval.start <= period.end && interval.end >= period.start;
}

/** Pertinência temporal: false when the execution interval is null. */
export function belongsToPeriod(
  activity: ActivityExecutionInput,
  period: InclusiveInterval,
  today: CivilDate,
): boolean {
  const interval = executionInterval(activity, today);
  return interval != null && intersects(interval, period);
}
