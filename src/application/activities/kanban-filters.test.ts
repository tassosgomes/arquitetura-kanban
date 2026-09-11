import { describe, expect, it } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";
import { TemporalQueryMode } from "@/application/temporal";
import type { ActivityListItem } from "@/application/activities/types";
import { EFFORT_FILTER_UNSET } from "@/application/activities/types";
import {
  activeKanbanShortcut,
  hasActiveKanbanFilters,
  KanbanPeriodOption,
  KanbanShortcut,
  parseKanbanSearchParams,
  shouldShowCancelledList,
  splitKanbanActivities,
  toActivityListFilter,
  toTemporalQuery,
} from "@/application/activities/kanban-filters";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const PARTICIPANT_ID = "22222222-2222-4222-8222-222222222222";
const AREA_ID = "33333333-3333-4333-8333-333333333333";
const ACTOR_ID = "44444444-4444-4444-8444-444444444444";

function listItem(
  overrides: Partial<ActivityListItem> & Pick<ActivityListItem, "id" | "title" | "status">,
): ActivityListItem {
  return {
    type: ActivityType.AD_HOC,
    priority: Priority.MEDIUM,
    effort: null,
    architectureRole: ArchitectureRole.RESPONSIBLE,
    startDate: "2026-08-25",
    expectedEndDate: null,
    completedDate: null,
    cancelledDate: null,
    checklistDoneCount: 0,
    checklistTotalCount: 0,
    project: null,
    requestingArea: { id: AREA_ID, name: "Financeiro", isActive: true },
    owner: { id: OWNER_ID, displayName: "Ana", email: null, isActive: true },
    updatedAt: new Date("2026-09-10T12:00:00.000Z"),
    version: 1,
    ...overrides,
  };
}

describe("kanban filters (T20)", () => {
  it("defaults to Todas without temporal cut or cancelled", () => {
    const { values, error } = parseKanbanSearchParams({});
    expect(error).toBeUndefined();
    expect(values.period).toBe(KanbanPeriodOption.ALL);
    expect(values.includeCancelled).toBe(false);
    expect(values.mine).toBe(false);
    expect(hasActiveKanbanFilters(values)).toBe(false);
    expect(activeKanbanShortcut(values)).toBe(KanbanShortcut.ALL);
    expect(toTemporalQuery(values)).toEqual({ mode: TemporalQueryMode.ALL });
    expect(toActivityListFilter(values, ACTOR_ID).includeCancelled).toBe(false);
  });

  it("keeps responsável and participante as distinct dimensions", () => {
    const { values } = parseKanbanSearchParams({
      owner: OWNER_ID,
      participant: PARTICIPANT_ID,
    });
    const filter = toActivityListFilter(values, ACTOR_ID);
    expect(filter.ownerId).toBe(OWNER_ID);
    expect(filter.participantId).toBe(PARTICIPANT_ID);
    expect(filter.ownerId).not.toBe(filter.participantId);
    expect(filter.involvedUserId).toBeUndefined();
  });

  it("maps Minha semana to this week plus current user as owner or participant", () => {
    const { values } = parseKanbanSearchParams({ period: "THIS_WEEK", mine: "1" });
    expect(activeKanbanShortcut(values)).toBe(KanbanShortcut.MY_WEEK);
    expect(toTemporalQuery(values)).toEqual({
      mode: TemporalQueryMode.PERIOD,
      period: "THIS_WEEK",
    });
    expect(toActivityListFilter(values, ACTOR_ID).involvedUserId).toBe(ACTOR_ID);
  });

  it("maps Sem planejamento without combining a period range (DE-16)", () => {
    const { values } = parseKanbanSearchParams({ period: "UNPLANNED" });
    expect(toTemporalQuery(values)).toEqual({ mode: TemporalQueryMode.UNPLANNED });
    expect(hasActiveKanbanFilters(values)).toBe(true);
  });

  it("accepts a custom inclusive range and rejects inverted dates", () => {
    const ok = parseKanbanSearchParams({
      period: "CUSTOM",
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(ok.error).toBeUndefined();
    expect(toTemporalQuery(ok.values)).toEqual({
      mode: TemporalQueryMode.PERIOD,
      period: { from: "2026-08-01", to: "2026-08-31" },
    });

    const inverted = parseKanbanSearchParams({
      period: "CUSTOM",
      from: "2026-09-10",
      to: "2026-09-01",
    });
    expect(inverted.error).toMatch(/final/i);
  });

  it("ignores invalid ids and empty query values", () => {
    const { values } = parseKanbanSearchParams({
      area: "not-a-uuid",
      project: "",
      nature: "NOPE",
      effort: EFFORT_FILTER_UNSET,
      includeCancelled: "1",
    });
    expect(values.areaId).toBeUndefined();
    expect(values.projectId).toBeUndefined();
    expect(values.nature).toBeUndefined();
    expect(values.effort).toBe(EFFORT_FILTER_UNSET);
    expect(values.includeCancelled).toBe(true);
  });

  it("shows cancelled in a list without putting them on the board", () => {
    const { values } = parseKanbanSearchParams({ includeCancelled: "1" });
    expect(shouldShowCancelledList(values)).toBe(true);

    const split = splitKanbanActivities([
      listItem({ id: "open", title: "Aberta", status: ActivityStatus.TODO }),
      listItem({
        id: "cancelled",
        title: "Cancelada",
        status: ActivityStatus.CANCELLED,
        cancelledDate: "2026-08-20",
      }),
    ]);
    expect(split.board.map((item) => item.id)).toEqual(["open"]);
    expect(split.cancelled.map((item) => item.id)).toEqual(["cancelled"]);
    expect(split.board.some((item) => item.status === ActivityStatus.CANCELLED)).toBe(false);
  });

  it("includes cancelled when the status filter is Cancelado", () => {
    const { values } = parseKanbanSearchParams({ status: ActivityStatus.CANCELLED });
    const filter = toActivityListFilter(values, ACTOR_ID);
    expect(filter.status).toBe(ActivityStatus.CANCELLED);
    expect(filter.includeCancelled).toBe(true);
    expect(shouldShowCancelledList(values)).toBe(true);
  });

  it("does not rewrite current status when a period filter is applied (DE-24)", () => {
    const { values } = parseKanbanSearchParams({ period: "THIS_MONTH" });
    const item = listItem({
      id: "ago-set",
      title: "Ago–set",
      status: ActivityStatus.DONE,
      startDate: "2026-08-25",
      completedDate: "2026-09-18",
    });
    const split = splitKanbanActivities([item]);
    expect(split.board[0]?.status).toBe(ActivityStatus.DONE);
    expect(toTemporalQuery(values).mode).toBe(TemporalQueryMode.PERIOD);
  });

  it("combines classification filters onto the list query", () => {
    const { values } = parseKanbanSearchParams({
      area: AREA_ID,
      nature: Nature.STRATEGIC,
      priority: Priority.HIGH,
      role: ArchitectureRole.CONTRIBUTOR,
      effort: Effort.M,
      status: ActivityStatus.BLOCKED,
    });
    expect(activeKanbanShortcut(values)).toBeNull();
    const filter = toActivityListFilter(values, ACTOR_ID);
    expect(filter.areaId).toBe(AREA_ID);
    expect(filter.nature).toBe(Nature.STRATEGIC);
    expect(filter.priority).toBe(Priority.HIGH);
    expect(filter.architectureRole).toBe(ArchitectureRole.CONTRIBUTOR);
    expect(filter.effort).toBe(Effort.M);
    expect(filter.status).toBe(ActivityStatus.BLOCKED);
  });
});
