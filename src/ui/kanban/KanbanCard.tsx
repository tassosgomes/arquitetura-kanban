"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { toKanbanCard } from "@/application/activities/kanban-board";
import type { ActivityListItem } from "@/application/activities/types";
import {
  ACTIVITY_STATUS_LABELS,
  ActivityStatus,
  isKanbanColumnStatus,
  KANBAN_COLUMN_STATUSES,
} from "@/domain/activity/enums";
import { PRIORITY_TONE } from "@/ui/activities/priority-tone";
import { formatCivilDatePtBr } from "@/ui/projects/project-types";

type KanbanCardProps = {
  activity: ActivityListItem;
};

type DraggableKanbanCardProps = {
  activity: ActivityListItem;
  disabled?: boolean;
  onMove: (activityId: string, toStatus: ActivityStatus) => void;
};

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function DragHandleIcon() {
  return (
    <span
      className="material-symbols-outlined text-[16px] text-outline transition-opacity group-hover:opacity-100 sm:opacity-40"
      aria-hidden="true"
    >
      drag_indicator
    </span>
  );
}

export function KanbanCardBody({ activity }: { activity: ActivityListItem }) {
  const card = toKanbanCard(activity);
  const tags = [card.projectName, card.areaLabel, card.roleLabel].filter(
    (part): part is string => Boolean(part),
  );

  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 flex-1 text-headline-sm leading-tight text-on-surface transition-colors group-hover:text-primary">
          {card.title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm font-semibold ${PRIORITY_TONE[activity.priority]}`}
        >
          {card.priorityLabel}
        </span>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-surface-container-low px-1.5 py-0.5 font-mono text-code-sm text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {card.checklistLabel || card.effortLabel ? (
        <div className="flex items-center gap-2 font-mono text-code-sm text-on-surface-variant">
          {card.checklistLabel ? (
            <span className="flex items-center gap-1 rounded-md bg-surface-container-low px-1.5 py-0.5">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                checklist
              </span>
              <span className="sr-only">Checklist </span>
              {card.checklistLabel}
            </span>
          ) : null}
          {card.effortLabel ? (
            <span className="rounded-md bg-surface-container-low px-1.5 py-0.5 font-semibold text-on-surface">
              {card.effortLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-on-secondary">
            {initials(card.ownerLabel)}
          </div>
          <span className="truncate text-body-sm text-on-surface-variant">{card.ownerLabel}</span>
        </div>
        {card.expectedEndDate ? (
          <div className="flex shrink-0 items-center gap-1 font-mono text-code-sm text-outline">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              calendar_today
            </span>
            <time dateTime={card.expectedEndDate}>{formatCivilDatePtBr(card.expectedEndDate)}</time>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const CARD_SURFACE_CLASS =
  "group flex flex-col gap-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-space-md shadow-sm transition-all hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

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
    <label className="flex flex-col gap-1 px-space-md pb-space-md">
      <span className="text-label-sm text-on-surface-variant">Mover para</span>
      <select
        key={`${activity.id}-${activity.status}-${activity.version}`}
        defaultValue=""
        disabled={disabled}
        aria-label={`Mover ${card.title} para`}
        className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1.5 text-body-sm text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
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
      className="mt-space-md ml-1 shrink-0 cursor-grab touch-none rounded px-1 py-1 text-outline hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
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
      className={`group flex flex-col rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-1">
        {handle}
        <Link
          href={`/activities/${card.activityId}`}
          id={titleId}
          className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg p-space-md pl-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
