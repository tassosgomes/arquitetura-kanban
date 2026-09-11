import { describe, expect, it } from "vitest";
import { ActivityStatus } from "@/domain/activity/enums";
import type { ActivityExecutionInput } from "@/domain/calendar/execution-interval";
import { executionInterval } from "@/domain/calendar/execution-interval";
import {
  PeriodPreset,
  filterByPeriod,
  resolvePeriod,
  resolveTemporalQuery,
  TemporalQueryMode,
} from "@/application/temporal";

const REFERENCE_NOW = new Date("2026-09-10T15:00:00-03:00");
const FX01_NOW = new Date("2026-09-20T12:00:00-03:00");
const YEAR_NOW = new Date("2026-01-05T12:00:00-03:00");

const AUGUST = { from: "2026-08-01", to: "2026-08-31" } as const;
const SEPTEMBER = { from: "2026-09-01", to: "2026-09-30" } as const;
const OCTOBER = { from: "2026-10-01", to: "2026-10-31" } as const;
const JULY = { from: "2026-07-01", to: "2026-07-31" } as const;
const YEAR_2024 = { from: "2024-01-01", to: "2024-12-31" } as const;
const YEAR_2025 = { from: "2025-01-01", to: "2025-12-31" } as const;

function activity(
  id: string,
  overrides: Partial<ActivityExecutionInput> &
    Pick<ActivityExecutionInput, "startDate" | "status">,
): ActivityExecutionInput & { id: string } {
  return {
    id,
    completedDate: null,
    cancelledDate: null,
    ...overrides,
  };
}

function ids(
  rows: readonly (ActivityExecutionInput & { id: string })[],
  query: Parameters<typeof filterByPeriod>[1],
  now: Date,
): string[] {
  return filterByPeriod(rows, query, now).map((row) => row.id);
}

const fx01 = activity("a-ago-set", {
  startDate: "2026-08-25",
  status: ActivityStatus.DONE,
  completedDate: "2026-09-18",
});

const fx01b = activity("a-ago-set-open", {
  startDate: "2026-08-25",
  status: ActivityStatus.IN_PROGRESS,
});

const fx02 = activity("a-sem-inicio", {
  startDate: null,
  status: ActivityStatus.TODO,
});

const fx03 = activity("a-aberta", {
  startDate: "2026-09-01",
  status: ActivityStatus.IN_PROGRESS,
});

const fx04 = activity("a-concluida-ago", {
  startDate: "2026-08-02",
  status: ActivityStatus.DONE,
  completedDate: "2026-08-20",
});

const fx05 = activity("a-reaberta", {
  startDate: "2026-08-01",
  status: ActivityStatus.IN_PROGRESS,
  completedDate: null,
});

const fx06 = activity("a-cancelada", {
  startDate: "2026-08-10",
  status: ActivityStatus.CANCELLED,
  cancelledDate: "2026-08-20",
});

const fx06b = activity("a-cancel-backlog", {
  startDate: null,
  status: ActivityStatus.CANCELLED,
  cancelledDate: "2026-08-12",
});

const fx08 = activity("a-corrigida", {
  startDate: "2026-08-25",
  status: ActivityStatus.DONE,
  completedDate: "2026-09-05",
});

const fx13 = activity("a-direct", {
  startDate: null,
  status: ActivityStatus.DONE,
  completedDate: "2026-09-08",
});

const fx14a = activity("a-virada", {
  startDate: "2026-08-31",
  status: ActivityStatus.IN_PROGRESS,
});

const fx14f = activity("a-futuro", {
  startDate: "2026-09-20",
  status: ActivityStatus.TODO,
});

describe("filterByPeriod pertinence (T02 FX)", () => {
  it("FX-01: 25/08–18/09 appears in August and September, not October", () => {
    const rows = [fx01];
    expect(executionInterval(fx01, "2026-09-20")).toEqual({
      start: "2026-08-25",
      end: "2026-09-18",
    });
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: AUGUST }, FX01_NOW)).toEqual([
      "a-ago-set",
    ]);
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: SEPTEMBER }, FX01_NOW)).toEqual([
      "a-ago-set",
    ]);
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: OCTOBER }, FX01_NOW)).toEqual([]);
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: JULY }, FX01_NOW)).toEqual([]);
    expect(ids(rows, { mode: TemporalQueryMode.ALL }, FX01_NOW)).toEqual(["a-ago-set"]);
    expect(ids(rows, { mode: TemporalQueryMode.UNPLANNED }, FX01_NOW)).toEqual([]);
  });

  it("FX-01b: still open through today intersects August and this month", () => {
    const rows = [fx01b];
    expect(executionInterval(fx01b, "2026-09-10")).toEqual({
      start: "2026-08-25",
      end: "2026-09-10",
    });
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: AUGUST }, REFERENCE_NOW)).toEqual([
      "a-ago-set-open",
    ]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH }, REFERENCE_NOW),
    ).toEqual(["a-ago-set-open"]);
  });

  it("FX-02: without start, only Todas / Sem planejamento", () => {
    const rows = [fx02];
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: AUGUST }, REFERENCE_NOW)).toEqual([]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH }, REFERENCE_NOW),
    ).toEqual([]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_YEAR }, REFERENCE_NOW),
    ).toEqual([]);
    expect(ids(rows, { mode: TemporalQueryMode.UNPLANNED }, REFERENCE_NOW)).toEqual(["a-sem-inicio"]);
    expect(ids(rows, { mode: TemporalQueryMode.ALL }, REFERENCE_NOW)).toEqual(["a-sem-inicio"]);
  });

  it("FX-03: open activity; previsão in the past does not pull it into August", () => {
    const withForecast = { ...fx03, expectedEndDate: "2026-08-30" };
    const rows = [withForecast];
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH }, REFERENCE_NOW),
    ).toEqual(["a-aberta"]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.LAST_MONTH }, REFERENCE_NOW),
    ).toEqual([]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_WEEK }, REFERENCE_NOW),
    ).toEqual(["a-aberta"]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.LAST_WEEK }, REFERENCE_NOW),
    ).toEqual(["a-aberta"]);
  });

  it("FX-04: completed in August stays out of this month", () => {
    const rows = [fx04];
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.LAST_MONTH }, REFERENCE_NOW),
    ).toEqual(["a-concluida-ago"]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH }, REFERENCE_NOW),
    ).toEqual([]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_YEAR }, REFERENCE_NOW),
    ).toEqual(["a-concluida-ago"]);
  });

  it("FX-05: reopened activity intersects August and September via current dates", () => {
    const rows = [fx05];
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: AUGUST }, REFERENCE_NOW)).toEqual([
      "a-reaberta",
    ]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH }, REFERENCE_NOW),
    ).toEqual(["a-reaberta"]);
  });

  it("FX-06: cancelled with a start intersects August only", () => {
    const rows = [fx06];
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: AUGUST }, REFERENCE_NOW)).toEqual([
      "a-cancelada",
    ]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH }, REFERENCE_NOW),
    ).toEqual([]);
  });

  it("FX-06b: cancelled from Backlog without start is unplanned", () => {
    const rows = [fx06b];
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: AUGUST }, REFERENCE_NOW)).toEqual([]);
    expect(ids(rows, { mode: TemporalQueryMode.UNPLANNED }, REFERENCE_NOW)).toEqual([
      "a-cancel-backlog",
    ]);
    expect(ids(rows, { mode: TemporalQueryMode.ALL }, REFERENCE_NOW)).toEqual(["a-cancel-backlog"]);
  });

  it("FX-07 pertinence: same activity in Aug/Sep, not Jul/Oct", () => {
    const rows = [fx01];
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: AUGUST }, FX01_NOW)).toHaveLength(1);
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: SEPTEMBER }, FX01_NOW)).toHaveLength(
      1,
    );
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: JULY }, FX01_NOW)).toHaveLength(0);
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: OCTOBER }, FX01_NOW)).toHaveLength(0);
  });

  it("FX-08: current dates after a retroactive correction populate August (DE-03)", () => {
    expect(ids([fx08], { mode: TemporalQueryMode.PERIOD, period: AUGUST }, REFERENCE_NOW)).toEqual([
      "a-corrigida",
    ]);
    expect(
      ids([fx08], { mode: TemporalQueryMode.PERIOD, period: SEPTEMBER }, REFERENCE_NOW),
    ).toEqual(["a-corrigida"]);
  });

  it("FX-13: direct conclusion without start stays out of this month", () => {
    const rows = [fx13];
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH }, REFERENCE_NOW),
    ).toEqual([]);
    expect(ids(rows, { mode: TemporalQueryMode.UNPLANNED }, REFERENCE_NOW)).toEqual(["a-direct"]);
    expect(ids(rows, { mode: TemporalQueryMode.ALL }, REFERENCE_NOW)).toEqual(["a-direct"]);
  });

  it("FX-14b: interval starting 01/09 is outside August", () => {
    const rows = [
      activity("a-set-inicio", {
        startDate: "2026-09-01",
        status: ActivityStatus.IN_PROGRESS,
      }),
    ];
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: AUGUST }, REFERENCE_NOW)).toEqual([]);
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: SEPTEMBER }, REFERENCE_NOW)).toEqual([
      "a-set-inicio",
    ]);
  });

  it("FX-14a: start 31/08 SP intersects August and September", () => {
    const rows = [fx14a];
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: AUGUST }, REFERENCE_NOW)).toEqual([
      "a-virada",
    ]);
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: SEPTEMBER }, REFERENCE_NOW)).toEqual([
      "a-virada",
    ]);
  });

  it("FX-14d: year boundaries around 2025–2026", () => {
    const yearSpan = activity("a-ano", {
      startDate: "2025-12-20",
      status: ActivityStatus.DONE,
      completedDate: "2026-01-03",
    });
    const rows = [yearSpan];
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: YEAR_2025 }, YEAR_NOW)).toEqual([
      "a-ano",
    ]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_YEAR }, YEAR_NOW),
    ).toEqual(["a-ano"]);
    expect(ids(rows, { mode: TemporalQueryMode.PERIOD, period: YEAR_2024 }, YEAR_NOW)).toEqual([]);
    expect(isoClose(YEAR_2025, YEAR_NOW)).toBe("2026-01-01T03:00:00.000Z");
  });

  it("FX-14e: this week / last week intersection, including a crossing activity", () => {
    const thisWeekOnly = activity("a-semana", {
      startDate: "2026-09-08",
      status: ActivityStatus.IN_PROGRESS,
    });
    const lastWeekOnly = activity("a-semana-passada", {
      startDate: "2026-09-01",
      status: ActivityStatus.DONE,
      completedDate: "2026-09-04",
    });
    const crossing = activity("a-cruzando", {
      startDate: "2026-09-04",
      status: ActivityStatus.IN_PROGRESS,
    });
    const rows = [thisWeekOnly, lastWeekOnly, crossing];

    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_WEEK }, REFERENCE_NOW),
    ).toEqual(["a-semana", "a-cruzando"]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.LAST_WEEK }, REFERENCE_NOW),
    ).toEqual(["a-semana-passada", "a-cruzando"]);
  });

  it("FX-14f: future start is excluded from the period and from Sem planejamento", () => {
    const rows = [fx14f];
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH }, REFERENCE_NOW),
    ).toEqual([]);
    expect(ids(rows, { mode: TemporalQueryMode.UNPLANNED }, REFERENCE_NOW)).toEqual([]);
    expect(ids(rows, { mode: TemporalQueryMode.ALL }, REFERENCE_NOW)).toEqual(["a-futuro"]);

    const later = new Date("2026-09-20T09:00:00-03:00");
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.THIS_MONTH }, later),
    ).toEqual(["a-futuro"]);
  });

  it("DE-16: Todas keeps mixed rows; Sem planejamento is XOR with period", () => {
    const rows = [fx01b, fx02, fx06, fx13, fx14f];
    expect(ids(rows, { mode: TemporalQueryMode.ALL }, REFERENCE_NOW)).toEqual([
      "a-ago-set-open",
      "a-sem-inicio",
      "a-cancelada",
      "a-direct",
      "a-futuro",
    ]);
    expect(ids(rows, { mode: TemporalQueryMode.UNPLANNED }, REFERENCE_NOW)).toEqual([
      "a-sem-inicio",
      "a-direct",
    ]);
    expect(
      ids(rows, { mode: TemporalQueryMode.PERIOD, period: PeriodPreset.LAST_MONTH }, REFERENCE_NOW),
    ).toEqual(["a-ago-set-open", "a-cancelada"]);
  });

  it("does not use status to choose a Kanban column (DE-24 is out of scope)", () => {
    const currentDone = activity("card", {
      startDate: "2026-08-25",
      status: ActivityStatus.DONE,
      completedDate: "2026-09-18",
    });
    const inAugust = filterByPeriod(
      [currentDone],
      { mode: TemporalQueryMode.PERIOD, period: AUGUST },
      FX01_NOW,
    );
    expect(inAugust).toHaveLength(1);
    expect(inAugust[0]?.status).toBe(ActivityStatus.DONE);
  });
});

describe("resolveTemporalQuery", () => {
  it("uses agora as fechamento for Todas and Sem planejamento", () => {
    expect(
      resolveTemporalQuery({ mode: TemporalQueryMode.ALL }, REFERENCE_NOW).fechamentoExclusivo.getTime(),
    ).toBe(REFERENCE_NOW.getTime());
    expect(
      resolveTemporalQuery({ mode: TemporalQueryMode.UNPLANNED }, REFERENCE_NOW).fechamentoExclusivo.getTime(),
    ).toBe(REFERENCE_NOW.getTime());
  });
});

function isoClose(period: { from: string; to: string }, now: Date): string {
  return resolvePeriod(period, now).fechamentoExclusivo.toISOString();
}
