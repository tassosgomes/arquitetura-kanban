import { describe, expect, it } from "vitest";
import { ActivityStatus, KANBAN_COLUMN_STATUSES } from "@/domain/activity/enums";
import { InvariantError } from "@/domain/errors";
import {
  applyStatusTransitionDates,
  assertStatusTransitionAllowed,
  DEFAULT_REOPEN_STATUS,
  isActivityCancellation,
  isActivityReopening,
  isStatusTransitionNoOp,
} from "@/domain/activity/status-transition";

const TODAY = "2026-09-10";
const emptyDates = {
  startDate: null,
  completedDate: null,
  cancelledDate: null,
};

describe("activity status transition matrix", () => {
  it("allows any board status to any board status (DE-08)", () => {
    for (const from of KANBAN_COLUMN_STATUSES) {
      for (const to of KANBAN_COLUMN_STATUSES) {
        expect(() => assertStatusTransitionAllowed(from, to)).not.toThrow();
      }
    }
  });

  it("allows cancel from any non-cancelled status", () => {
    for (const from of KANBAN_COLUMN_STATUSES) {
      expect(() =>
        assertStatusTransitionAllowed(from, ActivityStatus.CANCELLED),
      ).not.toThrow();
      expect(isActivityCancellation(from, ActivityStatus.CANCELLED)).toBe(true);
    }
  });

  it("rejects every transition out of Cancelled (DE-07 / RN-10)", () => {
    for (const to of [...KANBAN_COLUMN_STATUSES, ActivityStatus.CANCELLED]) {
      if (to === ActivityStatus.CANCELLED) {
        expect(() =>
          assertStatusTransitionAllowed(ActivityStatus.CANCELLED, to),
        ).not.toThrow();
        expect(isStatusTransitionNoOp(ActivityStatus.CANCELLED, to)).toBe(true);
        continue;
      }
      expect(() =>
        assertStatusTransitionAllowed(ActivityStatus.CANCELLED, to),
      ).toThrow(InvariantError);
    }
  });

  it("treats Done → board (except Done) as reopening and Done → Cancelled as cancel", () => {
    expect(isActivityReopening(ActivityStatus.DONE, ActivityStatus.IN_PROGRESS)).toBe(true);
    expect(isActivityReopening(ActivityStatus.DONE, ActivityStatus.TODO)).toBe(true);
    expect(isActivityReopening(ActivityStatus.DONE, ActivityStatus.DONE)).toBe(false);
    expect(isActivityReopening(ActivityStatus.DONE, ActivityStatus.CANCELLED)).toBe(false);
    expect(isActivityCancellation(ActivityStatus.DONE, ActivityStatus.CANCELLED)).toBe(true);
    expect(DEFAULT_REOPEN_STATUS).toBe(ActivityStatus.IN_PROGRESS);
  });
});

describe("applyStatusTransitionDates", () => {
  it("fills start on first entry into In progress and does not overwrite it (DE-23)", () => {
    const first = applyStatusTransitionDates({
      from: ActivityStatus.BACKLOG,
      to: ActivityStatus.IN_PROGRESS,
      dates: emptyDates,
      today: TODAY,
    });
    expect(first.startDate).toBe(TODAY);

    const resumed = applyStatusTransitionDates({
      from: ActivityStatus.WAITING,
      to: ActivityStatus.IN_PROGRESS,
      dates: { startDate: "2026-08-25", completedDate: null, cancelledDate: null },
      today: TODAY,
    });
    expect(resumed.startDate).toBe("2026-08-25");
  });

  it("fills completedDate on Done and does not invent a start (DE-09)", () => {
    const direct = applyStatusTransitionDates({
      from: ActivityStatus.BACKLOG,
      to: ActivityStatus.DONE,
      dates: emptyDates,
      today: TODAY,
    });
    expect(direct.startDate).toBeNull();
    expect(direct.completedDate).toBe(TODAY);
    expect(direct.cancelledDate).toBeNull();
  });

  it("fills cancelledDate on cancel without touching start or completion (DE-10)", () => {
    const cancelled = applyStatusTransitionDates({
      from: ActivityStatus.DONE,
      to: ActivityStatus.CANCELLED,
      dates: { startDate: "2026-08-01", completedDate: "2026-08-20", cancelledDate: null },
      today: TODAY,
    });
    expect(cancelled.startDate).toBe("2026-08-01");
    expect(cancelled.completedDate).toBe("2026-08-20");
    expect(cancelled.cancelledDate).toBe(TODAY);
  });

  it("clears completedDate on reopen and applies DE-23 when destination is In progress", () => {
    const reopened = applyStatusTransitionDates({
      from: ActivityStatus.DONE,
      to: ActivityStatus.IN_PROGRESS,
      dates: { startDate: null, completedDate: "2026-09-08", cancelledDate: null },
      today: TODAY,
    });
    expect(reopened.completedDate).toBeNull();
    expect(reopened.startDate).toBe(TODAY);

    const toTodo = applyStatusTransitionDates({
      from: ActivityStatus.DONE,
      to: ActivityStatus.TODO,
      dates: { startDate: "2026-08-01", completedDate: "2026-08-20", cancelledDate: null },
      today: TODAY,
    });
    expect(toTodo.completedDate).toBeNull();
    expect(toTodo.startDate).toBe("2026-08-01");
  });

  it("rejects inverted completion vs start (DE-13)", () => {
    expect(() =>
      applyStatusTransitionDates({
        from: ActivityStatus.TODO,
        to: ActivityStatus.DONE,
        dates: { startDate: "2026-09-20", completedDate: null, cancelledDate: null },
        today: TODAY,
      }),
    ).toThrow(InvariantError);
  });
});
