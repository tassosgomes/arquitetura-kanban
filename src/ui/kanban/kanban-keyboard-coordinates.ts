import {
  closestCorners,
  KeyboardCode,
  pointerWithin,
  type ClientRect,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  adjacentKanbanColumnStatus,
  kanbanColumnDroppableId,
  parseKanbanColumnDroppableId,
} from "@/application/activities/kanban-board";
import type { KanbanColumnStatus } from "@/application/activities/kanban-board";
import { isKanbanColumnStatus, type ActivityStatus } from "@/domain/activity/enums";

type CollisionDetectionArgs = Parameters<CollisionDetection>[0];

function isKeyboardDragAtOrigin({
  active,
  collisionRect,
  pointerCoordinates,
}: CollisionDetectionArgs): boolean {
  if (pointerCoordinates !== null) {
    return false;
  }

  const initialRect = active.rect.current.initial;
  if (!initialRect) {
    return true;
  }

  return collisionRect.left === initialRect.left && collisionRect.top === initialRect.top;
}

/**
 * KeyboardSensor has no pointer coordinates on activation. Keep its first
 * collision in the card's source column so pressing Space to drop is a no-op.
 */
function initialKeyboardColumnCollision(args: CollisionDetectionArgs) {
  if (!isKeyboardDragAtOrigin(args)) {
    return null;
  }

  const status = args.active.data.current?.status;
  if (typeof status !== "string" || !isKanbanColumnStatus(status as ActivityStatus)) {
    return null;
  }

  const sourceColumnId = kanbanColumnDroppableId(status as ActivityStatus);
  const collisions = closestCorners(args);
  const sourceCollision = collisions.find((collision) => collision.id === sourceColumnId);
  if (!sourceCollision) {
    return null;
  }

  return [sourceCollision, ...collisions.filter((collision) => collision.id !== sourceColumnId)];
}

export const kanbanCollisionDetection: CollisionDetection = (args) => {
  const initialCollision = initialKeyboardColumnCollision(args);
  if (initialCollision) {
    return initialCollision;
  }

  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }
  return closestCorners(args);
};

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
