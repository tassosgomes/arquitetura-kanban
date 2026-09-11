import { describe, expect, it } from "vitest";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";
import { resolveTemporalQuery, TemporalQueryMode } from "@/application/temporal";
import { ManagementPeriodOption } from "@/application/reports/search-params";
import {
  describeManagementPeriod,
  formatCivilDatePtBr,
  isFechamentoCappedToNow,
} from "@/application/reports/period-view";

const REFERENCE_NOW = new Date("2026-09-10T15:00:00-03:00");

describe("management period view (T26)", () => {
  it("shows inclusive this-month dates and caps closing at now", () => {
    const resolved = resolveTemporalQuery(
      { mode: TemporalQueryMode.PERIOD, period: "THIS_MONTH" },
      REFERENCE_NOW,
    );
    const view = describeManagementPeriod({
      period: ManagementPeriodOption.THIS_MONTH,
      resolved,
    });
    expect(view.start).toBe("2026-09-01");
    expect(view.end).toBe("2026-09-30");
    expect(view.startFormatted).toBe("01/09/2026");
    expect(view.endFormatted).toBe("30/09/2026");
    expect(view.isCappedToNow).toBe(true);
    expect(isFechamentoCappedToNow(resolved)).toBe(true);
    expect(view.periodDatesText).toContain("01/09/2026 a 30/09/2026");
    expect(view.closingText).toContain(APP_TIME_ZONE);
    expect(view.closingText).toMatch(/limitada a hoje/i);
    expect(view.semanticsText).toMatch(/históric/i);
  });

  it("keeps a closed past month at the exclusive next-day instant", () => {
    const resolved = resolveTemporalQuery(
      { mode: TemporalQueryMode.PERIOD, period: "LAST_MONTH" },
      REFERENCE_NOW,
    );
    const view = describeManagementPeriod({
      period: ManagementPeriodOption.LAST_MONTH,
      resolved,
    });
    expect(view.start).toBe("2026-08-01");
    expect(view.end).toBe("2026-08-31");
    expect(view.isCappedToNow).toBe(false);
    expect(view.fechamento.toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(view.closingText).not.toMatch(/limitada a hoje/i);
  });

  it("describes Todas and Sem planejamento without a date range", () => {
    const all = describeManagementPeriod({
      period: ManagementPeriodOption.ALL,
      resolved: resolveTemporalQuery({ mode: TemporalQueryMode.ALL }, REFERENCE_NOW),
    });
    expect(all.start).toBeNull();
    expect(all.periodDatesText).toMatch(/todas as atividades/i);
    expect(all.isCappedToNow).toBe(true);

    const unplanned = describeManagementPeriod({
      period: ManagementPeriodOption.UNPLANNED,
      resolved: resolveTemporalQuery({ mode: TemporalQueryMode.UNPLANNED }, REFERENCE_NOW),
    });
    expect(unplanned.periodDatesText).toMatch(/sem planejamento/i);
  });

  it("formats civil dates without UTC conversion", () => {
    expect(formatCivilDatePtBr("2026-08-01")).toBe("01/08/2026");
  });
});
