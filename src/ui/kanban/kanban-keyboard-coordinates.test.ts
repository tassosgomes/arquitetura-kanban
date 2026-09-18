import { describe, expect, it, vi } from "vitest";
import {
  KeyboardCode,
  type Active,
  type ClientRect,
  type DroppableContainer,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  ActivityStatus,
  KANBAN_COLUMN_STATUSES,
} from "@/domain/activity/enums";
import {
  kanbanColumnDroppableId,
  planKanbanStatusMove,
} from "@/application/activities/kanban-board";
import type { ActivityListItem } from "@/application/activities/types";
import {
  kanbanCollisionDetection,
  kanbanKeyboardCoordinates,
} from "@/ui/kanban/kanban-keyboard-coordinates";

function rect(left: number, top: number, width = 300, height = 500): ClientRect {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function column(id: UniqueIdentifier): DroppableContainer {
  return {
    id,
    key: id,
    data: { current: { type: "column" } },
    disabled: false,
    node: { current: null },
    rect: { current: null },
  };
}

function activeCard(status: ActivityStatus, initial: ClientRect | null): Active {
  return {
    id: "activity-1",
    data: { current: { type: "card", status } },
    rect: { current: { initial, translated: initial } },
  };
}

function collisionArgs(status: ActivityStatus, collisionRect: ClientRect) {
  const sourceId = kanbanColumnDroppableId(status);
  const nextStatus = KANBAN_COLUMN_STATUSES[KANBAN_COLUMN_STATUSES.indexOf(status) + 1];
  const nextId = nextStatus ? kanbanColumnDroppableId(nextStatus) : "kanban-column:next";
  const droppableRects = new Map<UniqueIdentifier, ClientRect>([
    [sourceId, rect(0, 0)],
    [nextId, rect(316, 0)],
  ]);

  return {
    active: activeCard(status, null),
    collisionRect,
    droppableRects,
    droppableContainers: [column(sourceId), column(nextId)],
    pointerCoordinates: null,
  } satisfies Parameters<typeof kanbanCollisionDetection>[0];
}

function keyboardCoordinates(
  code: KeyboardCode,
  status: ActivityStatus,
  droppableRects: Map<UniqueIdentifier, ClientRect>,
) {
  const event = {
    code,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
  const sourceId = kanbanColumnDroppableId(status);
  const args = {
    active: "activity-1",
    currentCoordinates: { x: 20, y: 20 },
    context: { over: { id: sourceId }, droppableRects },
  } as unknown as Parameters<typeof kanbanKeyboardCoordinates>[1];

  return { event, coordinates: kanbanKeyboardCoordinates(event, args) };
}

describe("Kanban keyboard drag", () => {
  it("keeps the source column as the initial target and makes same-column drop a no-op", () => {
    const status = ActivityStatus.BACKLOG;
    const sourceId = kanbanColumnDroppableId(status);
    const collision = kanbanCollisionDetection(collisionArgs(status, rect(16, 100, 280, 80)));

    expect(collision[0]?.id).toBe(sourceId);
    expect(
      planKanbanStatusMove(
        [{ id: "activity-1", status, version: 1 } as ActivityListItem],
        "activity-1",
        status,
      ),
    ).toBeNull();

    const movedArgs = collisionArgs(status, rect(332, 100, 280, 80));
    movedArgs.active.rect.current.initial = rect(16, 100, 280, 80);
    expect(kanbanCollisionDetection(movedArgs)[0]?.id).toBe(
      kanbanColumnDroppableId(ActivityStatus.TODO),
    );
  });

  it("moves exactly one column per arrow and stays inside the endpoints", () => {
    const droppableRects = new Map<UniqueIdentifier, ClientRect>(
      KANBAN_COLUMN_STATUSES.map((status, index) => [
        kanbanColumnDroppableId(status),
        rect(index * 316, 0),
      ]),
    );

    for (let index = 0; index < KANBAN_COLUMN_STATUSES.length - 1; index += 1) {
      const status = KANBAN_COLUMN_STATUSES[index];
      const nextStatus = KANBAN_COLUMN_STATUSES[index + 1];
      const { coordinates } = keyboardCoordinates(KeyboardCode.Right, status, droppableRects);
      expect(coordinates).toEqual({
        x: droppableRects.get(kanbanColumnDroppableId(nextStatus))?.left,
        y: droppableRects.get(kanbanColumnDroppableId(nextStatus))?.top,
      });
    }

    const first = keyboardCoordinates(
      KeyboardCode.Left,
      KANBAN_COLUMN_STATUSES[0],
      droppableRects,
    );
    const last = keyboardCoordinates(
      KeyboardCode.Right,
      KANBAN_COLUMN_STATUSES.at(-1)!,
      droppableRects,
    );
    expect(first.coordinates).toBeUndefined();
    expect(last.coordinates).toBeUndefined();
  });
});
