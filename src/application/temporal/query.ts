import type { ActivityExecutionInput } from "@/domain/calendar/execution-interval";
import { belongsToPeriod, isUnplanned } from "@/domain/calendar/execution-interval";
import {
  resolvePeriod,
  todayInAppTimeZone,
  type Instant,
  type PeriodSpec,
  type ResolvedPeriod,
} from "@/infrastructure/calendar/period";

/**
 * Recorte temporal compartilhado (domain-rules.md §9).
 * SEM_PLANEJAMENTO XOR PERIODO (DE-16); TODAS removes the cut.
 */
export const TemporalQueryMode = {
  ALL: "ALL",
  UNPLANNED: "UNPLANNED",
  PERIOD: "PERIOD",
} as const;

export type TemporalQueryMode = (typeof TemporalQueryMode)[keyof typeof TemporalQueryMode];

export type TemporalQuery =
  | { mode: typeof TemporalQueryMode.ALL }
  | { mode: typeof TemporalQueryMode.UNPLANNED }
  | { mode: typeof TemporalQueryMode.PERIOD; period: PeriodSpec };

export type ResolvedTemporalQuery =
  | {
      mode: typeof TemporalQueryMode.ALL;
      start: null;
      end: null;
      fechamentoExclusivo: Instant;
    }
  | {
      mode: typeof TemporalQueryMode.UNPLANNED;
      start: null;
      end: null;
      fechamentoExclusivo: Instant;
    }
  | ({ mode: typeof TemporalQueryMode.PERIOD } & ResolvedPeriod);

export function resolveTemporalQuery(query: TemporalQuery, now: Instant): ResolvedTemporalQuery {
  if (query.mode === TemporalQueryMode.PERIOD) {
    return { mode: TemporalQueryMode.PERIOD, ...resolvePeriod(query.period, now) };
  }

  return {
    mode: query.mode,
    start: null,
    end: null,
    fechamentoExclusivo: new Date(now.getTime()),
  };
}

/**
 * População pela pertinência temporal only (not portrait, not Kanban column).
 * Same function for board (T20), dashboard (T25) and reports (T27).
 */
export function filterByPeriod<T extends ActivityExecutionInput>(
  activities: readonly T[],
  query: TemporalQuery,
  now: Instant,
): T[] {
  const resolved = resolveTemporalQuery(query, now);

  if (resolved.mode === TemporalQueryMode.ALL) {
    return [...activities];
  }

  if (resolved.mode === TemporalQueryMode.UNPLANNED) {
    return activities.filter((activity) => isUnplanned(activity));
  }

  const today = todayInAppTimeZone(now);
  const period = { start: resolved.start, end: resolved.end };
  return activities.filter((activity) => belongsToPeriod(activity, period, today));
}
