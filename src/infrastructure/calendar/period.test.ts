import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import { instantToCivilDate } from "@/domain/calendar/civil-date";
import { ValidationError } from "@/domain/errors";
import {
  PeriodPreset,
  fechamentoExclusivo,
  isBeforeFechamento,
  resolvePeriod,
  startOfCivilDay,
  todayInAppTimeZone,
} from "@/infrastructure/calendar/period";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";

/** Relógio padrão das fixtures T02 (quinta-feira). */
const REFERENCE_NOW = new Date("2026-09-10T15:00:00-03:00");

function iso(value: Date): string {
  return value.toISOString();
}

describe("resolvePeriod (America/Sao_Paulo, Monday–Sunday)", () => {
  it("resolves the T02 shortcut table at the reference clock", () => {
    expect(resolvePeriod(PeriodPreset.THIS_WEEK, REFERENCE_NOW)).toMatchObject({
      start: "2026-09-07",
      end: "2026-09-13",
    });
    expect(iso(resolvePeriod(PeriodPreset.THIS_WEEK, REFERENCE_NOW).fechamentoExclusivo)).toBe(
      iso(REFERENCE_NOW),
    );

    const lastWeek = resolvePeriod(PeriodPreset.LAST_WEEK, REFERENCE_NOW);
    expect(lastWeek).toMatchObject({ start: "2026-08-31", end: "2026-09-06" });
    expect(iso(lastWeek.fechamentoExclusivo)).toBe("2026-09-07T03:00:00.000Z");

    const thisMonth = resolvePeriod(PeriodPreset.THIS_MONTH, REFERENCE_NOW);
    expect(thisMonth).toMatchObject({ start: "2026-09-01", end: "2026-09-30" });
    expect(iso(thisMonth.fechamentoExclusivo)).toBe(iso(REFERENCE_NOW));

    const lastMonth = resolvePeriod(PeriodPreset.LAST_MONTH, REFERENCE_NOW);
    expect(lastMonth).toMatchObject({ start: "2026-08-01", end: "2026-08-31" });
    expect(iso(lastMonth.fechamentoExclusivo)).toBe("2026-09-01T03:00:00.000Z");

    const quarter = resolvePeriod(PeriodPreset.THIS_QUARTER, REFERENCE_NOW);
    expect(quarter).toMatchObject({ start: "2026-07-01", end: "2026-09-30" });
    expect(iso(quarter.fechamentoExclusivo)).toBe(iso(REFERENCE_NOW));

    const year = resolvePeriod(PeriodPreset.THIS_YEAR, REFERENCE_NOW);
    expect(year).toMatchObject({ start: "2026-01-01", end: "2026-12-31" });
    expect(iso(year.fechamentoExclusivo)).toBe(iso(REFERENCE_NOW));
  });

  it("resolves an inclusive custom range and caps fechamento at now", () => {
    const past = resolvePeriod({ from: "2026-08-01", to: "2026-08-31" }, REFERENCE_NOW);
    expect(past).toMatchObject({ start: "2026-08-01", end: "2026-08-31" });
    expect(iso(past.fechamentoExclusivo)).toBe("2026-09-01T03:00:00.000Z");

    const includesToday = resolvePeriod({ from: "2026-09-01", to: "2026-09-15" }, REFERENCE_NOW);
    expect(iso(includesToday.fechamentoExclusivo)).toBe(iso(REFERENCE_NOW));

    const future = resolvePeriod({ from: "2026-10-01", to: "2026-10-31" }, REFERENCE_NOW);
    expect(future).toMatchObject({ start: "2026-10-01", end: "2026-10-31" });
    expect(iso(future.fechamentoExclusivo)).toBe(iso(REFERENCE_NOW));

    const singleDay = resolvePeriod({ from: "2026-09-10", to: "2026-09-10" }, REFERENCE_NOW);
    expect(singleDay).toMatchObject({ start: "2026-09-10", end: "2026-09-10" });
  });

  it("uses Monday as the first day even when today is Sunday", () => {
    const sunday = new Date("2026-09-13T18:00:00-03:00");
    expect(resolvePeriod(PeriodPreset.THIS_WEEK, sunday)).toMatchObject({
      start: "2026-09-07",
      end: "2026-09-13",
    });
    expect(resolvePeriod(PeriodPreset.LAST_WEEK, sunday)).toMatchObject({
      start: "2026-08-31",
      end: "2026-09-06",
    });
  });

  it("handles month, quarter and year boundaries", () => {
    const jan5 = new Date("2026-01-05T12:00:00-03:00");
    expect(resolvePeriod(PeriodPreset.LAST_MONTH, jan5)).toMatchObject({
      start: "2025-12-01",
      end: "2025-12-31",
    });
    expect(resolvePeriod(PeriodPreset.THIS_YEAR, jan5)).toMatchObject({
      start: "2026-01-01",
      end: "2026-12-31",
    });
    expect(resolvePeriod(PeriodPreset.THIS_QUARTER, jan5)).toMatchObject({
      start: "2026-01-01",
      end: "2026-03-31",
    });

    const mar10 = new Date("2026-03-10T12:00:00-03:00");
    expect(resolvePeriod(PeriodPreset.LAST_MONTH, mar10)).toMatchObject({
      start: "2026-02-01",
      end: "2026-02-28",
    });
    expect(resolvePeriod(PeriodPreset.THIS_QUARTER, mar10)).toMatchObject({
      start: "2026-01-01",
      end: "2026-03-31",
    });

    const oct1 = new Date("2026-10-01T09:00:00-03:00");
    expect(resolvePeriod(PeriodPreset.THIS_QUARTER, oct1)).toMatchObject({
      start: "2026-10-01",
      end: "2026-12-31",
    });
  });

  it("rejects inverted or invalid custom ranges", () => {
    expect(() => resolvePeriod({ from: "2026-09-10", to: "2026-09-01" }, REFERENCE_NOW)).toThrow(
      ValidationError,
    );
    expect(() => resolvePeriod({ from: "2026-02-31", to: "2026-03-01" }, REFERENCE_NOW)).toThrow(
      ValidationError,
    );
  });
});

describe("fechamentoExclusivo and timezone conversion (FX-14)", () => {
  it("never returns an instant after now", () => {
    const closing = fechamentoExclusivo("2026-12-31", REFERENCE_NOW);
    expect(closing.getTime()).toBe(REFERENCE_NOW.getTime());
  });

  it("FX-14a: 2026-09-01T01:30:00Z is still 31/08 in SP and before August close", () => {
    const event = new Date("2026-09-01T01:30:00Z");
    expect(event.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(todayInAppTimeZone(event)).toBe("2026-08-31");
    expect(instantToCivilDate(event, APP_TIME_ZONE)).toBe("2026-08-31");

    const august = resolvePeriod({ from: "2026-08-01", to: "2026-08-31" }, REFERENCE_NOW);
    expect(iso(august.fechamentoExclusivo)).toBe("2026-09-01T03:00:00.000Z");
    expect(isBeforeFechamento(event, august.fechamentoExclusivo)).toBe(true);
  });

  it("FX-14b: first instant of September SP is not before August close", () => {
    const event = new Date("2026-09-01T03:00:00Z");
    expect(todayInAppTimeZone(event)).toBe("2026-09-01");
    const augustClose = startOfCivilDay("2026-09-01");
    expect(iso(augustClose)).toBe("2026-09-01T03:00:00.000Z");
    expect(isBeforeFechamento(event, augustClose)).toBe(false);
  });

  it("FX-14c: last instant of August SP is before August close", () => {
    const event = new Date("2026-09-01T02:59:59.999Z");
    expect(todayInAppTimeZone(event)).toBe("2026-08-31");
    const augustClose = startOfCivilDay("2026-09-01");
    expect(isBeforeFechamento(event, augustClose)).toBe(true);
  });

  it("asserts Brazil has no DST offset change in 2026", () => {
    const winter = Temporal.ZonedDateTime.from({
      timeZone: APP_TIME_ZONE,
      year: 2026,
      month: 2,
      day: 15,
      hour: 12,
    });
    const spring = Temporal.ZonedDateTime.from({
      timeZone: APP_TIME_ZONE,
      year: 2026,
      month: 9,
      day: 15,
      hour: 12,
    });
    expect(winter.offset).toBe("-03:00");
    expect(spring.offset).toBe("-03:00");
  });
});
