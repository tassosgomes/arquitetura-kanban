"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
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
import type { ActivityRecord } from "@/application/activities";
import type { ActivityListItem } from "@/application/activities/types";
import {
  ACTIVITY_STATUS_LABELS,
  ActivityType,
  isKanbanColumnStatus,
  type ActivityStatus,
} from "@/domain/activity/enums";
import { ArchitectureRole, Priority } from "@/domain/catalog/classifications";
import { ACTIVITY_STATUS_DOT } from "@/ui/activities/ActivityStatusBadge";
import { DraggableKanbanCard, KanbanCardBody } from "@/ui/kanban/KanbanCard";
import {
  KanbanQuickCreate,
  type QuickActivityCreateDraft,
} from "@/ui/kanban/KanbanQuickCreate";
import {
  kanbanCollisionDetection,
  kanbanKeyboardCoordinates,
} from "@/ui/kanban/kanban-keyboard-coordinates";
import { useProtectOpenEdit } from "@/ui/realtime/useProtectOpenEdit";

type KanbanBoardProps = {
  activities: ActivityListItem[];
};

function activityTitle(items: readonly ActivityListItem[], id: UniqueIdentifier): string {
  return items.find((item) => item.id === String(id))?.title ?? "atividade";
}

function activityColumnStatus(
  items: readonly ActivityListItem[],
  id: UniqueIdentifier,
): ActivityStatus | null {
  const status = items.find((item) => item.id === String(id))?.status;
  return status && isKanbanColumnStatus(status) ? status : null;
}

function activityRecordToListItem(activity: ActivityRecord): ActivityListItem {
  const checklistDoneCount = activity.tasks.filter((task) => task.isDone).length;
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    type: activity.type,
    status: activity.status,
    priority: activity.priority,
    effort: activity.effort,
    architectureRole: activity.architectureRole,
    startDate: activity.startDate,
    expectedEndDate: activity.expectedEndDate,
    completedDate: activity.completedDate,
    cancelledDate: activity.cancelledDate,
    checklistDoneCount,
    checklistTotalCount: activity.tasks.length,
    project: activity.project,
    requestingArea: activity.requestingArea,
    owner: activity.owner,
    updatedAt: activity.updatedAt,
    version: activity.version,
  };
}

function optimisticActivityFromDraft(draft: QuickActivityCreateDraft): ActivityListItem {
  return {
    id: draft.optimisticId,
    title: draft.title,
    description: null,
    type: ActivityType.AD_HOC,
    status: draft.status,
    priority: Priority.MEDIUM,
    effort: null,
    architectureRole: ArchitectureRole.RESPONSIBLE,
    startDate: null,
    expectedEndDate: null,
    completedDate: null,
    cancelledDate: null,
    checklistDoneCount: 0,
    checklistTotalCount: 0,
    project: null,
    requestingArea: draft.requestingArea,
    owner: draft.owner,
    updatedAt: new Date(),
    version: 1,
  };
}

function kanbanAnnouncements(items: readonly ActivityListItem[]): Announcements {
  return {
    onDragStart({ active }) {
      const status = activityColumnStatus(items, active.id);
      const columnMessage = status ? ` na coluna ${ACTIVITY_STATUS_LABELS[status]}` : "";
      return `Atividade ${activityTitle(items, active.id)} selecionada${columnMessage}. Use as setas para mudar de coluna e Espaço para soltar.`;
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
  onOptimisticCreate,
  onCreateSuccess,
  onCreateFailure,
}: {
  column: KanbanColumn;
  disabled: boolean;
  onMove: (activityId: string, toStatus: ActivityStatus) => void;
  onOptimisticCreate: (draft: QuickActivityCreateDraft) => void;
  onCreateSuccess: (optimisticId: string, activity: ActivityRecord) => void;
  onCreateFailure: (optimisticId: string) => void;
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
      className={`flex min-h-0 max-h-full min-w-0 flex-col gap-space-sm rounded-2xl p-space-sm shadow-sm transition-colors ${
        isOver ? "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-surface" : "bg-surface-container-low"
      }`}
    >
      <KanbanQuickCreate
        columnLabel={column.label}
        status={column.status}
        disabled={disabled}
        onOptimisticCreate={onOptimisticCreate}
        onCreateSuccess={onCreateSuccess}
        onCreateFailure={onCreateFailure}
      >
        {({ trigger, form }) => (
          <>
            <header className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-surface-container-low px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${ACTIVITY_STATUS_DOT[column.status]}`}
                  aria-hidden="true"
                />
                <h2 id={headingId} className="text-headline-sm font-semibold text-on-surface">
                  {column.label}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-mono text-code-sm font-bold text-on-surface-variant">
                  {column.activities.length}
                </span>
                {trigger}
              </div>
            </header>
            {form}
            {column.activities.length === 0 ? (
              <p className="min-h-24 rounded-xl border border-dashed border-outline-variant px-3 py-6 text-center text-body-sm text-on-surface-variant">
                Nenhuma atividade nesta coluna.
              </p>
            ) : (
              <ul className="flex min-h-0 flex-1 flex-col gap-space-sm overflow-y-auto">
                {column.activities.map((activity) => (
                  <li key={activity.id}>
                    <DraggableKanbanCard activity={activity} disabled={disabled} onMove={onMove} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </KanbanQuickCreate>
    </section>
  );
}

export function KanbanBoard({ activities }: KanbanBoardProps) {
  const router = useRouter();
  const [items, setItems] = useState(activities);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creationMessage, setCreationMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isCreatePending, setIsCreatePending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  const createdQuickActivitiesRef = useRef(new Map<string, { title: string }>());
  useProtectOpenEdit(activeId !== null);

  useEffect(() => {
    if (pendingRef.current) {
      return;
    }

    const serverActivityIds = new Set(activities.map((activity) => activity.id));
    const missingCreated = [...createdQuickActivitiesRef.current.entries()].filter(
      ([id]) => !serverActivityIds.has(id),
    );
    if (missingCreated.length > 0) {
      const [, { title }] = missingCreated[0];
      setCreationMessage(
        `A atividade “${title}” foi criada, mas não corresponde aos filtros ativos e não aparece no board.`,
      );
    }
    for (const [id] of createdQuickActivitiesRef.current) {
      if (serverActivityIds.has(id) || missingCreated.some(([missingId]) => missingId === id)) {
        createdQuickActivitiesRef.current.delete(id);
      }
    }

    setItems(activities);
    // Depende só de `activities`: reconciliar é tarefa de quando chega dado novo do
    // servidor. Com `isCreatePending` aqui, encerrar a criação reexecutava o efeito
    // ainda com a lista anterior — apagava o card recém-criado e trocava o aviso de
    // sucesso por "não corresponde aos filtros ativos", que era falso.
  }, [activities]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: kanbanKeyboardCoordinates }),
  );

  const columns = useMemo(() => buildKanbanBoard(items), [items]);
  const total = columns.reduce((sum, column) => sum + column.activities.length, 0);
  const activeActivity = items.find((item) => item.id === activeId) ?? null;
  const boardBusy = isPending || isCreatePending;

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

  function onOptimisticCreate(draft: QuickActivityCreateDraft) {
    pendingRef.current = true;
    setIsCreatePending(true);
    setErrorMessage(null);
    setCreationMessage(null);
    setItems((current) => [...current, optimisticActivityFromDraft(draft)]);
  }

  function onCreateSuccess(optimisticId: string, activity: ActivityRecord) {
    const created = activityRecordToListItem(activity);
    createdQuickActivitiesRef.current.set(activity.id, { title: activity.title });
    pendingRef.current = false;
    setIsCreatePending(false);
    setItems((current) => {
      const replaced = current.some((item) => item.id === optimisticId);
      return replaced
        ? current.map((item) => (item.id === optimisticId ? created : item))
        : [...current, created];
    });
    setCreationMessage(
      `Atividade “${activity.title}” criada na coluna ${ACTIVITY_STATUS_LABELS[activity.status]}.`,
    );
    router.refresh();
  }

  function onCreateFailure(optimisticId: string) {
    pendingRef.current = false;
    setIsCreatePending(false);
    setItems((current) => current.filter((item) => item.id !== optimisticId));
  }

  return (
    <div className="flex flex-col gap-space-sm">
      {boardBusy ? (
        <p className="text-body-sm text-on-surface-variant" role="status" aria-live="polite">
          {isCreatePending ? "Criando atividade…" : "Movendo atividade…"}
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
      {creationMessage ? (
        <p
          className="rounded-xl border border-secondary-container/40 bg-secondary-container/10 p-space-md text-body-sm text-on-surface"
          role="status"
          aria-live="polite"
        >
          {creationMessage}
        </p>
      ) : null}
      {total === 0 ? (
        <p className="text-body-sm leading-6 text-on-surface-variant">
          Nenhuma atividade aberta no board. Cadastre uma atividade para começar. Canceladas não
          ocupam coluna.
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollisionDetection}
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
          className="-mx-4 h-[calc(100dvh-27rem)] min-h-0 overflow-x-auto overflow-y-hidden px-4 sm:h-[calc(100dvh-23rem)] lg:-mx-8 lg:h-[calc(100dvh-15rem)] lg:px-8"
          role="region"
          aria-label="Kanban da equipe"
          aria-busy={boardBusy || undefined}
        >
          <div className="grid h-full min-h-0 auto-cols-[minmax(280px,1fr)] grid-flow-col items-start gap-space-md pb-2">
            {columns.map((column) => (
              <KanbanColumnView
                key={column.status}
                column={column}
                disabled={boardBusy}
                onMove={persistMove}
                onOptimisticCreate={onOptimisticCreate}
                onCreateSuccess={onCreateSuccess}
                onCreateFailure={onCreateFailure}
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
