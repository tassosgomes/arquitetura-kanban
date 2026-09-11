import { describe, expect, it } from "vitest";
import { ActivityStatus } from "@/domain/activity/enums";
import {
  belongsToPeriod,
  executionInterval,
  intersects,
  isUnplanned,
  type ActivityExecutionInput,
} from "@/domain/calendar/execution-interval";

const TODAY = "2026-09-10";
const AUGUST = { start: "2026-08-01", end: "2026-08-31" };
const SEPTEMBER = { start: "2026-09-01", end: "2026-09-30" };
const OCTOBER = { start: "2026-10-01", end: "2026-10-31" };
const JULY = { start: "2026-07-01", end: "2026-07-31" };

function activity(
  overrides: Partial<ActivityExecutionInput> &
    Pick<ActivityExecutionInput, "startDate" | "status">,
): ActivityExecutionInput {
  return {
    completedDate: null,
    cancelledDate: null,
    ...overrides,
  };
}

describe("executionInterval", () => {
  it("returns null without a start date (FX-02 / conclusão direta)", () => {
    expect(
      executionInterval(activity({ startDate: null, status: ActivityStatus.TODO }), TODAY),
    ).toBeNull();
    expect(
      executionInterval(
        activity({
          startDate: null,
          status: ActivityStatus.DONE,
          completedDate: "2026-09-08",
        }),
        TODAY,
      ),
    ).toBeNull();
    expect(
      executionInterval(
        activity({
          startDate: null,
          status: ActivityStatus.CANCELLED,
          cancelledDate: "2026-08-12",
        }),
        TODAY,
      ),
    ).toBeNull();
  });

  it("uses today as the end for any open status (previsão ignored)", () => {
    const open = [
      ActivityStatus.BACKLOG,
      ActivityStatus.TODO,
      ActivityStatus.IN_PROGRESS,
      ActivityStatus.WAITING,
      ActivityStatus.BLOCKED,
    ];
    for (const status of open) {
      expect(
        executionInterval(
          activity({
            startDate: "2026-08-25",
            status,
            completedDate: "2026-09-01",
            cancelledDate: "2026-09-02",
          }),
          TODAY,
        ),
      ).toEqual({ start: "2026-08-25", end: TODAY });
    }

    const withForecast = {
      startDate: "2026-09-01",
      status: ActivityStatus.IN_PROGRESS,
      expectedEndDate: "2026-08-30",
    };
    expect(executionInterval(withForecast, TODAY)).toEqual({
      start: "2026-09-01",
      end: TODAY,
    });
  });

  it("uses completion or cancellation as the effective end", () => {
    expect(
      executionInterval(
        activity({
          startDate: "2026-08-25",
          status: ActivityStatus.DONE,
          completedDate: "2026-09-18",
        }),
        "2026-09-20",
      ),
    ).toEqual({ start: "2026-08-25", end: "2026-09-18" });

    expect(
      executionInterval(
        activity({
          startDate: "2026-08-10",
          status: ActivityStatus.CANCELLED,
          cancelledDate: "2026-08-20",
        }),
        TODAY,
      ),
    ).toEqual({ start: "2026-08-10", end: "2026-08-20" });
  });

  it("returns null for a future start until today catches up (DE-11 / FX-14f)", () => {
    const future = activity({ startDate: "2026-09-20", status: ActivityStatus.TODO });
    expect(executionInterval(future, TODAY)).toBeNull();
    expect(executionInterval(future, "2026-09-20")).toEqual({
      start: "2026-09-20",
      end: "2026-09-20",
    });
  });

  it("returns null when the effective end is missing", () => {
    expect(
      executionInterval(
        activity({ startDate: "2026-08-01", status: ActivityStatus.DONE }),
        TODAY,
      ),
    ).toBeNull();
    expect(
      executionInterval(
        activity({ startDate: "2026-08-01", status: ActivityStatus.CANCELLED }),
        TODAY,
      ),
    ).toBeNull();
  });

  it("treats a reopened activity as open through today", () => {
    expect(
      executionInterval(
        activity({
          startDate: "2026-08-01",
          status: ActivityStatus.IN_PROGRESS,
          completedDate: null,
        }),
        TODAY,
      ),
    ).toEqual({ start: "2026-08-01", end: TODAY });
  });
});

describe("intersects (inclusive days)", () => {
  it("includes both endpoints of the consulted period", () => {
    expect(intersects({ start: "2026-08-31", end: "2026-08-31" }, AUGUST)).toBe(true);
    expect(intersects({ start: "2026-08-31", end: "2026-08-31" }, SEPTEMBER)).toBe(false);
    expect(intersects({ start: "2026-09-01", end: "2026-09-01" }, AUGUST)).toBe(false);
    expect(intersects({ start: "2026-09-01", end: "2026-09-01" }, SEPTEMBER)).toBe(true);
    expect(intersects({ start: "2026-08-31", end: "2026-09-01" }, AUGUST)).toBe(true);
    expect(intersects({ start: "2026-08-31", end: "2026-09-01" }, SEPTEMBER)).toBe(true);
  });
});

describe("belongsToPeriod / isUnplanned", () => {
  it("FX-01: 25/08–18/09 is in August and September, not October", () => {
    const agoSet = activity({
      startDate: "2026-08-25",
      status: ActivityStatus.DONE,
      completedDate: "2026-09-18",
    });
    expect(belongsToPeriod(agoSet, AUGUST, "2026-09-20")).toBe(true);
    expect(belongsToPeriod(agoSet, SEPTEMBER, "2026-09-20")).toBe(true);
    expect(belongsToPeriod(agoSet, OCTOBER, "2026-09-20")).toBe(false);
    expect(belongsToPeriod(agoSet, JULY, "2026-09-20")).toBe(false);
    expect(isUnplanned(agoSet)).toBe(false);
  });

  it("FX-02 / FX-13: no start is unplanned and outside every period", () => {
    const unplanned = activity({ startDate: null, status: ActivityStatus.TODO });
    const direct = activity({
      startDate: null,
      status: ActivityStatus.DONE,
      completedDate: "2026-09-08",
    });
    expect(isUnplanned(unplanned)).toBe(true);
    expect(isUnplanned(direct)).toBe(true);
    expect(belongsToPeriod(unplanned, AUGUST, TODAY)).toBe(false);
    expect(belongsToPeriod(direct, SEPTEMBER, TODAY)).toBe(false);
  });

  it("FX-14f: a future start is not unplanned", () => {
    const future = activity({ startDate: "2026-09-20", status: ActivityStatus.TODO });
    expect(isUnplanned(future)).toBe(false);
    expect(belongsToPeriod(future, SEPTEMBER, TODAY)).toBe(false);
  });
});
