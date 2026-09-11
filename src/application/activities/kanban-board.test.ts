import { describe, expect, it } from "vitest";
import { ActivityStatus, ActivityType, KANBAN_COLUMN_STATUSES } from "@/domain/activity/enums";
import { ArchitectureRole, Effort, Priority } from "@/domain/catalog/classifications";
import type { ActivityListItem } from "@/application/activities/types";
import {
  buildKanbanBoard,
  KANBAN_BOARD_SCOPE,
  toKanbanCard,
} from "@/application/activities/kanban-board";

function listItem(
  overrides: Partial<ActivityListItem> & Pick<ActivityListItem, "id" | "title" | "status">,
): ActivityListItem {
  return {
    type: ActivityType.AD_HOC,
    priority: Priority.HIGH,
    effort: Effort.M,
    architectureRole: ArchitectureRole.CONTRIBUTOR,
    expectedEndDate: "2026-09-30",
    checklistDoneCount: 3,
    checklistTotalCount: 5,
    project: null,
    requestingArea: { id: "area-1", name: "Financeiro", isActive: true },
    owner: { id: "u-1", displayName: "João", email: "joao@ex.com", isActive: true },
    updatedAt: new Date("2026-09-10T12:00:00.000Z"),
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
