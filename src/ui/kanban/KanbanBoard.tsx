"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { changeActivityStatusAction } from "@/app/actions/activities";
import {
  applyKanbanStatusMove,
  buildKanbanBoard,
  kanbanColumnDroppableId,
  planKanbanStatusMove,
  resolveKanbanDropStatus,
  type KanbanColumn,
} from "@/application/activities/kanban-board";
import type { ActivityListItem } from "@/application/activities/types";
import { ACTIVITY_STATUS_LABELS, type ActivityStatus } from "@/domain/activity/enums";
import { ACTIVITY_STATUS_DOT } from "@/ui/activities/ActivityStatusBadge";
import { DraggableKanbanCard, KanbanCardBody } from "@/ui/kanban/KanbanCard";
import { kanbanKeyboardCoordinates } from "@/ui/kanban/kanban-keyboard-coordinates";
import { useProtectOpenEdit } from "@/ui/realtime/useProtectOpenEdit";

type KanbanBoardProps = {
  activities: ActivityListItem[];
};

const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }
  return closestCorners(args);
};

function activityTitle(items: readonly ActivityListItem[], id: UniqueIdentifier): string {
  return items.find((item) => item.id === String(id))?.title ?? "atividade";
}

function kanbanAnnouncements(items: readonly ActivityListItem[]): Announcements {
  return {
    onDragStart({ active }) {
      return `Atividade ${activityTitle(items, active.id)} selecionada. Use as setas para mudar de coluna e Espaço para soltar.`;
    },
    onDragOver({ active, over }) {
      const status = resolveKanbanDropStatus(over?.id, items);
      if (!status) {
        return `Atividade ${activityTitle(items, active.id)} fora de uma coluna.`;
      }
      return `Atividade ${activityTitle(items, active.id)} sobre ${ACTIVITY_STATUS_LABELS[status]}.`;
    },
    onDragEnd({ active, over }) {
      const status = resolveKanbanDropStatus(over?.id, items);
      if (!status) {
        return `Atividade ${activityTitle(items, active.id)} não foi movida.`;
      }
      return `Atividade ${activityTitle(items, active.id)} solta em ${ACTIVITY_STATUS_LABELS[status]}.`;
    },
    onDragCancel({ active }) {
      return `Movimentação cancelada. Atividade ${activityTitle(items, active.id)} voltou à coluna original.`;
    },
  };
}

function KanbanColumnView({
  column,
  disabled,
  onMove,
}: {
  column: KanbanColumn;
  disabled: boolean;
  onMove: (activityId: string, toStatus: ActivityStatus) => void;
}) {
  const headingId = `kanban-coluna-${column.status.toLowerCase()}`;
  const { setNodeRef, isOver } = useDroppable({
    id: kanbanColumnDroppableId(column.status),
    data: { type: "column", status: column.status },
    disabled,
  });

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col gap-space-sm rounded-2xl p-space-sm shadow-sm transition-colors ${
        isOver ? "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-surface" : "bg-surface-container-low"
      }`}
    >
      <header className="flex items-center justify-between gap-2 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${ACTIVITY_STATUS_DOT[column.status]}`} aria-hidden="true" />
          <h2 id={headingId} className="text-headline-sm font-semibold text-on-surface">
            {column.label}
          </h2>
        </div>
        <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-mono text-code-sm font-bold text-on-surface-variant">
          {column.activities.length}
        </span>
      </header>
      {column.activities.length === 0 ? (
        <p className="min-h-24 rounded-xl border border-dashed border-outline-variant px-3 py-6 text-center text-body-sm text-on-surface-variant">
          Nenhuma atividade nesta coluna.
        </p>
      ) : (
        <ul className="flex min-h-24 flex-col gap-space-sm">
          {column.activities.map((activity) => (
            <li key={activity.id}>
              <DraggableKanbanCard activity={activity} disabled={disabled} onMove={onMove} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function KanbanBoard({ activities }: KanbanBoardProps) {
  const router = useRouter();
  const [items, setItems] = useState(activities);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  useProtectOpenEdit(activeId !== null);

  useEffect(() => {
    if (!pendingRef.current) {
      setItems(activities);
    }
  }, [activities]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: kanbanKeyboardCoordinates }),
  );

  const columns = useMemo(() => buildKanbanBoard(items), [items]);
  const total = columns.reduce((sum, column) => sum + column.activities.length, 0);
  const activeActivity = items.find((item) => item.id === activeId) ?? null;

  function persistMove(activityId: string, toStatus: ActivityStatus) {
    const plan = planKanbanStatusMove(items, activityId, toStatus);
    if (!plan) {
      return;
    }

    const previous = items;
    pendingRef.current = true;
    setErrorMessage(null);
    setItems(applyKanbanStatusMove(items, activityId, toStatus));

    startTransition(async () => {
      const result = await changeActivityStatusAction(plan);
      if (!result.ok) {
        setItems(previous);
        pendingRef.current = false;
        setErrorMessage(result.error.message);
        router.refresh();
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === result.data.id
            ? { ...item, status: result.data.status, version: result.data.version }
            : item,
        ),
      );
      pendingRef.current = false;
      router.refresh();
    });
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
    setErrorMessage(null);
  }

  function onDragCancel() {
    setActiveId(null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over?.id;
    if (overId == null) {
      return;
    }
    const toStatus = resolveKanbanDropStatus(overId, items);
    if (!toStatus) {
      return;
    }
    persistMove(String(event.active.id), toStatus);
  }

  return (
    <div className="flex flex-col gap-space-sm">
      {isPending ? (
        <p className="text-body-sm text-on-surface-variant" role="status" aria-live="polite">
          Movendo atividade…
        </p>
      ) : null}
      {errorMessage ? (
        <div
          className="rounded-xl border border-secondary-container/40 bg-secondary-container/10 p-space-md text-body-sm text-on-surface"
          role="alert"
        >
          <p>{errorMessage}</p>
          <button
            type="button"
            className="mt-2 rounded-md px-2 py-1 text-body-sm font-medium text-primary underline hover:text-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => {
              setErrorMessage(null);
              router.refresh();
            }}
          >
            Recarregar o board
          </button>
        </div>
      ) : null}
      {total === 0 ? (
        <p className="text-body-sm leading-6 text-on-surface-variant">
          Nenhuma atividade aberta no board. Cadastre uma atividade para começar. Canceladas não
          ocupam coluna.
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
        accessibility={{
          announcements: kanbanAnnouncements(items),
          screenReaderInstructions: {
            draggable:
              "Para pegar o card, pressione Espaço. Use as setas para mudar de coluna. Espaço solta; Escape cancela.",
          },
        }}
      >
        <div
          className="-mx-4 overflow-x-auto px-4 lg:-mx-8 lg:px-8"
          role="region"
          aria-label="Kanban da equipe"
          aria-busy={isPending || undefined}
        >
          <div className="grid auto-cols-[minmax(280px,1fr)] grid-flow-col items-start gap-space-md pb-2">
            {columns.map((column) => (
              <KanbanColumnView
                key={column.status}
                column={column}
                disabled={isPending}
                onMove={persistMove}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeActivity ? (
            <div className="w-72 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-space-md shadow-xl">
              <div className="flex flex-col gap-2">
                <KanbanCardBody activity={activeActivity} />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
