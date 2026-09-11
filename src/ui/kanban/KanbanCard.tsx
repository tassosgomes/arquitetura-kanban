"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import {
  toKanbanCard,
  type KanbanCardData,
} from "@/application/activities/kanban-board";
import type { ActivityListItem } from "@/application/activities/types";
import {
  ACTIVITY_STATUS_LABELS,
  ActivityStatus,
  isKanbanColumnStatus,
  KANBAN_COLUMN_STATUSES,
} from "@/domain/activity/enums";
import { formatCivilDatePtBr } from "@/ui/projects/project-types";

type KanbanCardProps = {
  activity: ActivityListItem;
};

type DraggableKanbanCardProps = {
  activity: ActivityListItem;
  disabled?: boolean;
  onMove: (activityId: string, toStatus: ActivityStatus) => void;
};

function metaLine(card: KanbanCardData): string {
  return [card.priorityLabel, card.effortLabel, card.roleLabel]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 12 16" aria-hidden="true" className="h-4 w-3 fill-current">
      <circle cx="3" cy="3" r="1.3" />
      <circle cx="9" cy="3" r="1.3" />
      <circle cx="3" cy="8" r="1.3" />
      <circle cx="9" cy="8" r="1.3" />
      <circle cx="3" cy="13" r="1.3" />
      <circle cx="9" cy="13" r="1.3" />
    </svg>
  );
}

export function KanbanCardBody({ activity }: { activity: ActivityListItem }) {
  const card = toKanbanCard(activity);

  return (
    <>
      <h3 className="text-sm font-medium leading-5 text-zinc-900">{card.title}</h3>
      {card.projectName ? <p className="text-xs leading-4 text-zinc-600">{card.projectName}</p> : null}
      <p className="text-xs leading-4 text-zinc-700">
        {card.areaLabel} · {card.ownerLabel}
      </p>
      <p className="text-xs leading-4 text-zinc-700">{metaLine(card)}</p>
      {card.checklistLabel || card.expectedEndDate ? (
        <p className="flex items-center justify-between gap-2 text-xs leading-4 text-zinc-600">
          {card.checklistLabel ? (
            <span>
              <span className="sr-only">Checklist </span>
              {card.checklistLabel}
            </span>
          ) : (
            <span />
          )}
          {card.expectedEndDate ? (
            <time dateTime={card.expectedEndDate}>{formatCivilDatePtBr(card.expectedEndDate)}</time>
          ) : null}
        </p>
      ) : null}
    </>
  );
}

const CARD_SURFACE_CLASS =
  "flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";

/** Presentational card (T17 / lista de canceladas da T20). Sem DnD — pode ficar fora de DndContext. */
export function KanbanCard({ activity }: KanbanCardProps) {
  const card = toKanbanCard(activity);

  return (
    <Link href={`/activities/${card.activityId}`} className={CARD_SURFACE_CLASS}>
      <KanbanCardBody activity={activity} />
    </Link>
  );
}

function MoveSelect({
  activity,
  disabled,
  onMove,
}: {
  activity: ActivityListItem;
  disabled: boolean;
  onMove: (activityId: string, toStatus: ActivityStatus) => void;
}) {
  const card = toKanbanCard(activity);
  const destinations = KANBAN_COLUMN_STATUSES.filter((status) => status !== activity.status);

  return (
    <label className="flex flex-col gap-1 px-3 pb-3">
      <span className="text-xs font-medium text-zinc-600">Mover para</span>
      <select
        key={`${activity.id}-${activity.status}-${activity.version}`}
        defaultValue=""
        disabled={disabled}
        aria-label={`Mover ${card.title} para`}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100"
        onChange={(event) => {
          const value = event.target.value as ActivityStatus;
          if (isKanbanColumnStatus(value)) {
            onMove(activity.id, value);
          }
        }}
      >
        <option value="" disabled>
          Escolher coluna
        </option>
        {destinations.map((status) => (
          <option key={status} value={status}>
            {ACTIVITY_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DraggableKanbanCard({
  activity,
  disabled = false,
  onMove,
}: DraggableKanbanCardProps) {
  const card = toKanbanCard(activity);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: activity.id,
    data: { type: "card", status: activity.status },
    disabled,
    attributes: { roleDescription: "card da atividade" },
  });
  const titleId = `kanban-card-title-${activity.id}`;
  const handle: ReactNode = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="mt-3 ml-1 shrink-0 cursor-grab touch-none rounded px-1 py-1 text-zinc-500 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 active:cursor-grabbing disabled:cursor-not-allowed disabled:text-zinc-300"
      aria-label={`Arrastar ${card.title}`}
      disabled={disabled}
      {...listeners}
      {...attributes}
    >
      <DragHandleIcon />
    </button>
  );

  return (
    <article
      ref={setNodeRef}
      aria-labelledby={titleId}
      className={`flex flex-col rounded-lg border border-zinc-200 bg-white shadow-sm ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-1">
        {handle}
        <Link
          href={`/activities/${card.activityId}`}
          id={titleId}
          className="flex min-w-0 flex-1 flex-col gap-2 rounded-md p-3 pl-1 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          <KanbanCardBody activity={activity} />
        </Link>
      </div>
      {activity.status === ActivityStatus.CANCELLED ? null : (
        <MoveSelect activity={activity} disabled={disabled} onMove={onMove} />
      )}
    </article>
  );
}
