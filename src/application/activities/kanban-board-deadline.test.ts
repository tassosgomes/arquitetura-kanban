import { describe, expect, it } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Effort, Priority } from "@/domain/catalog/classifications";
import type { ActivityListItem } from "@/application/activities/types";
import {
  DeadlineStatus,
} from "@/application/reports/deadline-status";
import {
  todayInProjectTimeZone,
  toKanbanCard,
} from "@/application/activities/kanban-board";

function listItem(overrides: Partial<ActivityListItem> = {}): ActivityListItem {
  return {
    id: "activity-1",
    title: "Atividade de teste",
    description: null,
    type: ActivityType.AD_HOC,
    status: ActivityStatus.IN_PROGRESS,
    priority: Priority.MEDIUM,
    effort: Effort.M,
    architectureRole: ArchitectureRole.CONTRIBUTOR,
    startDate: "2026-09-01",
    expectedEndDate: "2026-09-10",
    completedDate: null,
    cancelledDate: null,
    checklistDoneCount: 0,
    checklistTotalCount: 0,
    project: null,
    requestingArea: { id: "area-1", name: "Arquitetura", isActive: true },
    owner: { id: "user-1", displayName: "Ana", email: null, isActive: true },
    updatedAt: new Date("2026-09-10T15:00:00.000Z"),
    version: 1,
    ...overrides,
  };
}

describe("deadline signal in the Kanban card mapper (KUX-02)", () => {
  it("marks an unfinished activity as overdue with the number of late days", () => {
    const card = toKanbanCard(listItem(), "2026-09-13");

    expect(card.deadlineStatus).toBe(DeadlineStatus.OVERDUE);
    expect(card.deadlineDaysLate).toBe(3);
    expect(card.deadlineStatusLabel).toBe("Atrasado há 3 dias");
    expect(card.deadlineIsDueToday).toBe(false);
  });

  it("marks an activity due today even when its workflow status is not started", () => {
    const card = toKanbanCard(
      listItem({ status: ActivityStatus.TODO, expectedEndDate: "2026-09-10" }),
      "2026-09-10",
    );

    expect(card.deadlineStatus).toBe(DeadlineStatus.NOT_STARTED);
    expect(card.deadlineStatusLabel).toBe("Vence hoje");
    expect(card.deadlineIsDueToday).toBe(true);
    expect(card.deadlineDaysLate).toBeNull();
  });

  it("keeps a future forecast neutral", () => {
    const card = toKanbanCard(
      listItem({ expectedEndDate: "2026-09-20" }),
      "2026-09-10",
    );

    expect(card.deadlineStatus).toBe(DeadlineStatus.ON_TIME);
    expect(card.deadlineStatusLabel).toBe("No prazo");
    expect(card.deadlineIsDueToday).toBe(false);
    expect(card.deadlineDaysLate).toBeNull();
  });

  it("shows no forecast without classifying the card as overdue", () => {
    const card = toKanbanCard(
      listItem({ expectedEndDate: null }),
      "2026-09-10",
    );

    expect(card.deadlineStatus).toBe(DeadlineStatus.NO_FORECAST);
    expect(card.deadlineStatusLabel).toBe("Sem previsão");
    expect(card.deadlineIsDueToday).toBe(false);
    expect(card.deadlineDaysLate).toBeNull();
  });

  it("does not mark a completed activity overdue when its forecast has passed", () => {
    const card = toKanbanCard(
      listItem({
        status: ActivityStatus.DONE,
        expectedEndDate: "2026-09-05",
        completedDate: "2026-09-07",
      }),
      "2026-09-10",
    );

    expect(card.deadlineStatus).toBe(DeadlineStatus.COMPLETED_LATE);
    expect(card.deadlineStatus).not.toBe(DeadlineStatus.OVERDUE);
    expect(card.deadlineDaysLate).toBeNull();
    expect(card.deadlineIsDueToday).toBe(false);
  });

  it("resolves the civil day at 23:30 and 00:30 in America/Sao_Paulo", () => {
    const activity = listItem();
    const beforeMidnight = new Date("2026-09-10T23:30:00-03:00");
    const afterMidnight = new Date("2026-09-11T00:30:00-03:00");

    expect(todayInProjectTimeZone(beforeMidnight)).toBe("2026-09-10");
    expect(todayInProjectTimeZone(afterMidnight)).toBe("2026-09-11");
    expect(toKanbanCard(activity, todayInProjectTimeZone(beforeMidnight)).deadlineStatus).toBe(
      DeadlineStatus.ON_TIME,
    );
    expect(toKanbanCard(activity, todayInProjectTimeZone(afterMidnight))).toMatchObject({
      deadlineStatus: DeadlineStatus.OVERDUE,
      deadlineDaysLate: 1,
    });
  });
});
