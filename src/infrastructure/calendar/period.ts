import { Temporal } from "@js-temporal/polyfill";
import { isCivilDateString, type CivilDate } from "@/domain/calendar/civil-date";
import { ValidationError } from "@/domain/errors";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";

/** Absolute instant at the application boundary (timestamptz / `Clock.now()`). */
export type Instant = Date;

export const PeriodPreset = {
  THIS_WEEK: "THIS_WEEK",
  LAST_WEEK: "LAST_WEEK",
  THIS_MONTH: "THIS_MONTH",
  LAST_MONTH: "LAST_MONTH",
  THIS_QUARTER: "THIS_QUARTER",
  THIS_YEAR: "THIS_YEAR",
} as const;

export type PeriodPreset = (typeof PeriodPreset)[keyof typeof PeriodPreset];

export const PERIOD_PRESETS: readonly PeriodPreset[] = [
  PeriodPreset.THIS_WEEK,
  PeriodPreset.LAST_WEEK,
  PeriodPreset.THIS_MONTH,
  PeriodPreset.LAST_MONTH,
  PeriodPreset.THIS_QUARTER,
  PeriodPreset.THIS_YEAR,
];

/** Inclusive custom range (`intervalo personalizado`). */
export type CustomPeriod = {
  from: CivilDate;
  to: CivilDate;
};

export type PeriodSpec = PeriodPreset | CustomPeriod;

export type ResolvedPeriod = {
  start: CivilDate;
  end: CivilDate;
  fechamentoExclusivo: Instant;
};

const PRESET_SET = new Set<string>(PERIOD_PRESETS);

export function isPeriodPreset(value: unknown): value is PeriodPreset {
  return typeof value === "string" && PRESET_SET.has(value);
}

export function isCustomPeriod(value: unknown): value is CustomPeriod {
  return (
    typeof value === "object" &&
    value !== null &&
    "from" in value &&
    "to" in value &&
    typeof (value as CustomPeriod).from === "string" &&
    typeof (value as CustomPeriod).to === "string"
  );
}

/** DE-21: civil day of `now` in America/Sao_Paulo. Never `Date#toISOString().slice(0, 10)`. */
export function todayInAppTimeZone(now: Instant): CivilDate {
  return plainDateFromInstant(requireInstant(now)).toString();
}

/** DE-01: `[início_do_dia(D), início_do_dia(D+1))` — returns the left bound as an instant. */
export function startOfCivilDay(date: CivilDate): Instant {
  return zonedMidnight(requireCivilDate(date, "date"));
}

/**
 * DE-02: `min(início_do_dia(fimPeriodo + 1 dia), agora)`. Never a future instant.
 * Events enter a portrait iff `occurred_at < fechamentoExclusivo`.
 */
export function fechamentoExclusivo(periodEnd: CivilDate, now: Instant): Instant {
  const instant = requireInstant(now);
  const nextDayStart = zonedMidnight(requireCivilDate(periodEnd, "periodEnd").add({ days: 1 }));
  return minInstant(nextDayStart, instant);
}

/** Strictly before the exclusive closing instant (DE-04 / DE-20). */
export function isBeforeFechamento(occurredAt: Instant, closing: Instant): boolean {
  return requireInstant(occurredAt).getTime() < requireInstant(closing).getTime();
}

/**
 * Resolve esta semana / semana passada / este mês / mês passado / este trimestre /
 * este ano / intervalo personalizado in America/Sao_Paulo. Week is Monday–Sunday.
 * `fimPeriodo` may be in the future (intersection); fechamento never is (DE-02).
 */
export function resolvePeriod(spec: PeriodSpec, now: Instant): ResolvedPeriod {
  const instant = requireInstant(now);
  const today = plainDateFromInstant(instant);
  const { start, end } = typeof spec === "string" ? rangeFromPreset(spec, today) : customRange(spec);

  return {
    start: start.toString(),
    end: end.toString(),
    fechamentoExclusivo: fechamentoExclusivo(end.toString(), instant),
  };
}

function rangeFromPreset(
  preset: string,
  today: Temporal.PlainDate,
): { start: Temporal.PlainDate; end: Temporal.PlainDate } {
  if (!isPeriodPreset(preset)) {
    throw new ValidationError("Unknown period preset", { period: ["must be a supported shortcut"] });
  }

  switch (preset) {
    case PeriodPreset.THIS_WEEK: {
      const start = mondayOnOrBefore(today);
      return { start, end: start.add({ days: 6 }) };
    }
    case PeriodPreset.LAST_WEEK: {
      const thisMonday = mondayOnOrBefore(today);
      const start = thisMonday.subtract({ days: 7 });
      return { start, end: thisMonday.subtract({ days: 1 }) };
    }
    case PeriodPreset.THIS_MONTH: {
      const start = today.with({ day: 1 });
      return { start, end: start.add({ months: 1 }).subtract({ days: 1 }) };
    }
    case PeriodPreset.LAST_MONTH: {
      const end = today.with({ day: 1 }).subtract({ days: 1 });
      return { start: end.with({ day: 1 }), end };
    }
    case PeriodPreset.THIS_QUARTER: {
      const startMonth = Math.floor((today.month - 1) / 3) * 3 + 1;
      const start = today.with({ month: startMonth, day: 1 });
      return { start, end: start.add({ months: 3 }).subtract({ days: 1 }) };
    }
    case PeriodPreset.THIS_YEAR:
      return {
        start: today.with({ month: 1, day: 1 }),
        end: today.with({ month: 12, day: 31 }),
      };
  }
}

function customRange(spec: CustomPeriod): { start: Temporal.PlainDate; end: Temporal.PlainDate } {
  const start = requireCivilDate(spec.from, "from");
  const end = requireCivilDate(spec.to, "to");
  if (Temporal.PlainDate.compare(start, end) > 0) {
    throw new ValidationError("Custom period must be inclusive and ordered", {
      to: ["must be on or after from"],
    });
  }
  return { start, end };
}

/** ISO weekday: Monday = 1, Sunday = 7. Do not use `Date#getDay()`. */
function mondayOnOrBefore(date: Temporal.PlainDate): Temporal.PlainDate {
  return date.subtract({ days: date.dayOfWeek - 1 });
}

function plainDateFromInstant(now: Instant): Temporal.PlainDate {
  return Temporal.Instant.fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(APP_TIME_ZONE)
    .toPlainDate();
}

function zonedMidnight(date: Temporal.PlainDate): Instant {
  return new Date(date.toZonedDateTime(APP_TIME_ZONE).toInstant().epochMilliseconds);
}

function minInstant(left: Instant, right: Instant): Instant {
  return new Date(Math.min(left.getTime(), right.getTime()));
}

function requireInstant(value: Instant): Instant {
  if (Number.isNaN(value.getTime())) {
    throw new ValidationError("Invalid instant", { now: ["must be a valid instant"] });
  }
  return value;
}

function requireCivilDate(value: string, field: string): Temporal.PlainDate {
  if (!isCivilDateString(value)) {
    throw new ValidationError("Invalid civil date", {
      [field]: ["must be a real calendar day YYYY-MM-DD"],
    });
  }
  return Temporal.PlainDate.from(value);
}
