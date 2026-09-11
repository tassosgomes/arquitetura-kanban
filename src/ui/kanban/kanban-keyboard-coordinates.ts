import {
  KeyboardCode,
  type ClientRect,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  adjacentKanbanColumnStatus,
  kanbanColumnDroppableId,
  parseKanbanColumnDroppableId,
} from "@/application/activities/kanban-board";
import type { KanbanColumnStatus } from "@/application/activities/kanban-board";

function columnAtPoint(
  x: number,
  y: number,
  droppableRects: Map<UniqueIdentifier, ClientRect>,
): KanbanColumnStatus | null {
  for (const [id, rect] of droppableRects) {
    const status = parseKanbanColumnDroppableId(String(id));
    if (!status) {
      continue;
    }
    if (
      x >= rect.left &&
      x <= rect.left + rect.width &&
      y >= rect.top &&
      y <= rect.top + rect.height
    ) {
      return status;
    }
  }
  return null;
}

/**
 * Arrow keys jump to the previous/next Kanban column (no in-column ranking).
 * Up/Left = previous; Down/Right = next.
 */
export const kanbanKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context: { over, droppableRects } },
) => {
  const direction: -1 | 1 | 0 =
    event.code === KeyboardCode.Right || event.code === KeyboardCode.Down
      ? 1
      : event.code === KeyboardCode.Left || event.code === KeyboardCode.Up
        ? -1
        : 0;
  if (direction === 0) {
    return;
  }

  event.preventDefault();

  const currentStatus =
    parseKanbanColumnDroppableId(over ? String(over.id) : "") ??
    columnAtPoint(currentCoordinates.x, currentCoordinates.y, droppableRects);

  if (!currentStatus) {
    return;
  }

  const nextStatus = adjacentKanbanColumnStatus(currentStatus, direction);
  if (!nextStatus) {
    return;
  }

  const rect = droppableRects.get(kanbanColumnDroppableId(nextStatus));
  if (!rect) {
    return;
  }

  return { x: rect.left, y: rect.top };
};
