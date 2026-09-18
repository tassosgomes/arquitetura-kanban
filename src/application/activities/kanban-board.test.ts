import { describe, expect, it } from "vitest";
import { ActivityStatus, ActivityType, KANBAN_COLUMN_STATUSES } from "@/domain/activity/enums";
import { ArchitectureRole, Effort, Priority } from "@/domain/catalog/classifications";
import type { ActivityListItem } from "@/application/activities/types";
import { changeActivityStatusSchema } from "@/application/activities/schemas";
import {
  adjacentKanbanColumnStatus,
  applyKanbanStatusMove,
  buildKanbanBoard,
  KANBAN_BOARD_SCOPE,
  kanbanColumnDroppableId,
  parseKanbanColumnDroppableId,
  planKanbanStatusMove,
  resolveKanbanDropStatus,
  toKanbanCard,
} from "@/application/activities/kanban-board";

function listItem(
  overrides: Partial<ActivityListItem> & Pick<ActivityListItem, "id" | "title" | "status">,
): ActivityListItem {
  return {
    type: ActivityType.AD_HOC,
    description: null,
    priority: Priority.HIGH,
    effort: Effort.M,
    architectureRole: ArchitectureRole.CONTRIBUTOR,
    startDate: null,
    expectedEndDate: "2026-09-30",
    completedDate: null,
    cancelledDate: null,
    checklistDoneCount: 3,
    checklistTotalCount: 5,
    project: null,
    requestingArea: { id: "area-1", name: "Financeiro", isActive: true },
    owner: { id: "u-1", displayName: "João", email: "joao@ex.com", isActive: true },
    updatedAt: new Date("2026-09-10T12:00:00.000Z"),
    version: 1,
    ...overrides,
  };
}

describe("kanban board (T17 / RN-01–02)", () => {
  it("is a single team board and does not split by person or period", () => {
    expect(KANBAN_BOARD_SCOPE).toBe("team");
    expect(buildKanbanBoard.length).toBe(1);

    const columns = buildKanbanBoard([
      listItem({
        id: "a-ana",
        title: "Atividade da Ana",
        status: ActivityStatus.TODO,
        owner: { id: "ana", displayName: "Ana", email: null, isActive: true },
        expectedEndDate: "2026-08-31",
      }),
      listItem({
        id: "a-carlos",
        title: "Atividade do Carlos",
        status: ActivityStatus.TODO,
        owner: { id: "carlos", displayName: "Carlos", email: null, isActive: true },
        expectedEndDate: "2026-09-30",
      }),
    ]);

    expect(columns).toHaveLength(1 * KANBAN_COLUMN_STATUSES.length);
    const todo = columns.find((column) => column.status === ActivityStatus.TODO)?.activities ?? [];
    expect(todo.map((activity) => activity.id)).toEqual(["a-ana", "a-carlos"]);
    expect(todo.map((activity) => activity.owner.displayName)).toEqual(["Ana", "Carlos"]);
  });

  it("uses the six default columns and keeps Cancelled off the board", () => {
    const columns = buildKanbanBoard([
      listItem({ id: "open", title: "Aberta", status: ActivityStatus.BACKLOG }),
      listItem({ id: "cancelled", title: "Cancelada", status: ActivityStatus.CANCELLED }),
    ]);

    expect(columns.map((column) => column.label)).toEqual([
      "Backlog",
      "A fazer",
      "Em andamento",
      "Aguardando retorno",
      "Bloqueado",
      "Concluído",
    ]);
    expect(columns.some((column) => column.status === ActivityStatus.CANCELLED)).toBe(false);
    expect(columns.flatMap((column) => column.activities).map((activity) => activity.id)).toEqual([
      "open",
    ]);
  });

  it("places each activity card in the column of its current status", () => {
    const columns = buildKanbanBoard([
      listItem({ id: "backlog", title: "B", status: ActivityStatus.BACKLOG }),
      listItem({ id: "doing", title: "D", status: ActivityStatus.IN_PROGRESS }),
      listItem({ id: "done", title: "C", status: ActivityStatus.DONE }),
    ]);

    expect(columns.find((column) => column.status === ActivityStatus.BACKLOG)?.activities[0]?.id).toBe(
      "backlog",
    );
    expect(
      columns.find((column) => column.status === ActivityStatus.IN_PROGRESS)?.activities[0]?.id,
    ).toBe("doing");
    expect(columns.find((column) => column.status === ActivityStatus.DONE)?.activities[0]?.id).toBe(
      "done",
    );
    expect(columns.find((column) => column.status === ActivityStatus.TODO)?.activities).toEqual([]);
  });

  it("maps one card to one activity with the essential Kanban fields", () => {
    const activity = listItem({
      id: "act-1",
      title: "Definir arquitetura de integração",
      status: ActivityStatus.IN_PROGRESS,
      project: { id: "p1", name: "Implantação ERP", status: "IN_PROGRESS" },
    });

    const card = toKanbanCard(activity);

    expect(card.activityId).toBe(activity.id);
    expect(card.title).toBe(activity.title);
    expect(card.projectName).toBe("Implantação ERP");
    expect(card.areaLabel).toBe("Financeiro");
    expect(card.ownerLabel).toBe("João");
    expect(card.priorityLabel).toBe("Alta");
    expect(card.effortLabel).toBe("M");
    expect(card.roleLabel).toBe("Contribuidor");
    expect(card.checklistLabel).toBe("3/5");
    expect(card.expectedEndDate).toBe("2026-09-30");
  });

  it("omits optional card fields when they are absent", () => {
    const card = toKanbanCard(
      listItem({
        id: "adhoc",
        title: "Demanda pontual",
        status: ActivityStatus.TODO,
        effort: null,
        expectedEndDate: null,
        checklistDoneCount: 0,
        checklistTotalCount: 0,
        project: null,
      }),
    );

    expect(card.projectName).toBeNull();
    expect(card.effortLabel).toBeNull();
    expect(card.checklistLabel).toBeNull();
    expect(card.expectedEndDate).toBeNull();
  });
});

describe("kanban movement (T18)", () => {
  const activityId = "11111111-1111-4111-8111-111111111111";

  it("plans a column move with the list item version for T14", () => {
    const activities = [
      listItem({ id: activityId, title: "Mover", status: ActivityStatus.TODO, version: 4 }),
    ];

    const plan = planKanbanStatusMove(activities, activityId, ActivityStatus.IN_PROGRESS);

    expect(plan).toEqual({
      id: activityId,
      version: 4,
      status: ActivityStatus.IN_PROGRESS,
    });
    expect(changeActivityStatusSchema.safeParse(plan).success).toBe(true);
  });

  it("does not persist ranking when the card stays in the same column", () => {
    const activities = [
      listItem({ id: activityId, title: "Mesma coluna", status: ActivityStatus.TODO, version: 2 }),
    ];

    expect(planKanbanStatusMove(activities, activityId, ActivityStatus.TODO)).toBeNull();
  });

  it("does not plan a move to Cancelled from the board", () => {
    const activities = [
      listItem({ id: activityId, title: "Aberta", status: ActivityStatus.TODO, version: 1 }),
    ];

    expect(planKanbanStatusMove(activities, activityId, ActivityStatus.CANCELLED)).toBeNull();
  });

  it("applies an optimistic status change without reordering siblings", () => {
    const first = listItem({ id: "a", title: "A", status: ActivityStatus.TODO });
    const second = listItem({ id: "b", title: "B", status: ActivityStatus.TODO });
    const third = listItem({ id: "c", title: "C", status: ActivityStatus.IN_PROGRESS });

    const moved = applyKanbanStatusMove([first, second, third], "b", ActivityStatus.DONE);

    expect(moved.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(moved[1]?.status).toBe(ActivityStatus.DONE);
    expect(moved[0]?.status).toBe(ActivityStatus.TODO);
  });

  it("resolves drop targets from column ids or cards already in a column", () => {
    const doing = listItem({
      id: "doing-id",
      title: "Em andamento",
      status: ActivityStatus.IN_PROGRESS,
    });

    expect(parseKanbanColumnDroppableId(kanbanColumnDroppableId(ActivityStatus.BLOCKED))).toBe(
      ActivityStatus.BLOCKED,
    );
    expect(resolveKanbanDropStatus(kanbanColumnDroppableId(ActivityStatus.WAITING), [doing])).toBe(
      ActivityStatus.WAITING,
    );
    expect(resolveKanbanDropStatus(doing.id, [doing])).toBe(ActivityStatus.IN_PROGRESS);
    expect(resolveKanbanDropStatus("unknown", [doing])).toBeNull();
  });

  it("moves between adjacent columns with arrow keys", () => {
    expect(adjacentKanbanColumnStatus(ActivityStatus.TODO, 1)).toBe(ActivityStatus.IN_PROGRESS);
    expect(adjacentKanbanColumnStatus(ActivityStatus.TODO, -1)).toBe(ActivityStatus.BACKLOG);
    expect(adjacentKanbanColumnStatus(ActivityStatus.BACKLOG, -1)).toBeNull();
    expect(adjacentKanbanColumnStatus(ActivityStatus.DONE, 1)).toBeNull();
  });
});
