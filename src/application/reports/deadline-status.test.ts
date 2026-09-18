import { describe, expect, it } from "vitest";
import { ActivityStatus } from "@/domain/activity/enums";
import {
  classifyDeadlineStatus,
  DEADLINE_STATUS_LABELS,
  DeadlineStatus,
  type DeadlineStatusInput,
} from "@/application/reports/deadline-status";

const TODAY = "2026-09-10";

function input(overrides: Partial<DeadlineStatusInput> = {}): DeadlineStatusInput {
  return {
    status: ActivityStatus.IN_PROGRESS,
    expectedEndDate: "2026-09-20",
    completedDate: null,
    today: TODAY,
    ...overrides,
  };
}

describe("classifyDeadlineStatus", () => {
  it("returns Sem previsão before the other conditions", () => {
    expect(
      classifyDeadlineStatus(
        input({ status: ActivityStatus.CANCELLED, expectedEndDate: null }),
      ),
    ).toBe(DeadlineStatus.NO_FORECAST);
  });

  it("returns Cancelada for a cancelled activity with a forecast", () => {
    expect(
      classifyDeadlineStatus(
        input({ status: ActivityStatus.CANCELLED, expectedEndDate: "2026-09-01" }),
      ),
    ).toBe(DeadlineStatus.CANCELLED);
  });

  it("returns No prazo when a concluded activity finishes on or before its forecast", () => {
    expect(
      classifyDeadlineStatus(
        input({
          status: ActivityStatus.DONE,
          expectedEndDate: "2026-09-05",
          completedDate: "2026-09-05",
        }),
      ),
    ).toBe(DeadlineStatus.ON_TIME);
    expect(
      classifyDeadlineStatus(
        input({
          status: ActivityStatus.DONE,
          expectedEndDate: "2026-09-05",
          completedDate: "2026-09-04",
        }),
      ),
    ).toBe(DeadlineStatus.ON_TIME);
  });

  it("returns Concluída com atraso when completion is after the forecast", () => {
    expect(
      classifyDeadlineStatus(
        input({
          status: ActivityStatus.DONE,
          expectedEndDate: "2026-09-01",
          completedDate: "2026-09-05",
        }),
      ),
    ).toBe(DeadlineStatus.COMPLETED_LATE);
  });

  it("returns Atrasado for an unfinished activity whose forecast is before today", () => {
    expect(
      classifyDeadlineStatus(
        input({ status: ActivityStatus.IN_PROGRESS, expectedEndDate: "2026-09-09" }),
      ),
    ).toBe(DeadlineStatus.OVERDUE);
  });

  it("checks Atrasado before Não iniciada for an overdue Backlog or A fazer activity", () => {
    for (const status of [ActivityStatus.BACKLOG, ActivityStatus.TODO]) {
      expect(
        classifyDeadlineStatus(input({ status, expectedEndDate: "2026-09-09" })),
      ).toBe(DeadlineStatus.OVERDUE);
    }
  });

  it("returns Não iniciada for Backlog and A fazer activities due today or later", () => {
    for (const status of [ActivityStatus.BACKLOG, ActivityStatus.TODO]) {
      expect(
        classifyDeadlineStatus(input({ status, expectedEndDate: TODAY })),
      ).toBe(DeadlineStatus.NOT_STARTED);
      expect(
        classifyDeadlineStatus(input({ status, expectedEndDate: "2026-09-11" })),
      ).toBe(DeadlineStatus.NOT_STARTED);
    }
  });

  it("returns No prazo for other unfinished statuses that are not overdue", () => {
    for (const status of [ActivityStatus.IN_PROGRESS, ActivityStatus.WAITING, ActivityStatus.BLOCKED]) {
      expect(
        classifyDeadlineStatus(input({ status, expectedEndDate: TODAY })),
      ).toBe(DeadlineStatus.ON_TIME);
    }
  });
});

describe("DEADLINE_STATUS_LABELS", () => {
  it("exposes the labels used by the Book", () => {
    expect(DEADLINE_STATUS_LABELS).toEqual({
      [DeadlineStatus.NO_FORECAST]: "Sem previsão",
      [DeadlineStatus.CANCELLED]: "Cancelada",
      [DeadlineStatus.ON_TIME]: "No prazo",
      [DeadlineStatus.COMPLETED_LATE]: "Concluída com atraso",
      [DeadlineStatus.OVERDUE]: "Atrasado",
      [DeadlineStatus.NOT_STARTED]: "Não iniciada",
    });
  });
});
