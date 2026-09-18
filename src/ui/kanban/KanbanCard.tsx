"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { toKanbanCard } from "@/application/activities/kanban-board";
import type { KanbanCardData } from "@/application/activities/kanban-board";
import type { ActivityListItem } from "@/application/activities/types";
import { DeadlineStatus } from "@/application/reports/deadline-status";
import {
  ACTIVITY_STATUS_LABELS,
  ActivityStatus,
  isKanbanColumnStatus,
  KANBAN_COLUMN_STATUSES,
} from "@/domain/activity/enums";
import { Priority } from "@/domain/catalog/classifications";
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
      className="material-symbols-outlined text-[16px] text-outline opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      aria-hidden="true"
    >
      drag_indicator
    </span>
  );
}

export function KanbanCardBody({ activity }: { activity: ActivityListItem }) {
  const card = toKanbanCard(activity);
  const isPriorityException =
    activity.priority === Priority.HIGH || activity.priority === Priority.CRITICAL;
  const priorityLabel = `Prioridade ${card.priorityLabel}`;

  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <h3
          title={card.title}
          className="line-clamp-3 min-w-0 flex-1 text-headline-sm leading-tight text-on-surface transition-colors group-hover:text-primary"
        >
          {card.title}
        </h3>
        <span
          title={priorityLabel}
          className={`${
            isPriorityException
              ? "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-label-sm font-semibold"
              : "inline-flex size-2.5 shrink-0 rounded-full border border-outline-variant"
          } ${PRIORITY_TONE[activity.priority]}`}
        >
          {isPriorityException ? (
            <>
              <span className="sr-only">Prioridade </span>
              {card.priorityLabel}
            </>
          ) : (
            <span className="sr-only">{priorityLabel}</span>
          )}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-on-secondary">
            {initials(card.ownerLabel)}
          </div>
          <span className="truncate text-body-sm text-on-surface-variant">{card.ownerLabel}</span>
        </div>
        <DeadlineIndicator card={card} />
      </div>

      {card.projectName || card.areaLabel ? (
        <div className="flex min-w-0 flex-nowrap gap-1.5">
          {card.projectName ? (
            <span
              title={card.projectName}
              className="min-w-0 flex-1 truncate rounded-md bg-surface-container-low px-1.5 py-0.5 text-body-sm text-on-surface-variant"
            >
              {card.projectName}
            </span>
          ) : null}
          <span
            title={card.areaLabel}
            className="min-w-0 flex-1 truncate rounded-md bg-surface-container-low px-1.5 py-0.5 text-body-sm text-on-surface-variant"
          >
            {card.areaLabel}
          </span>
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
    </div>
  );
}

function DeadlineIndicator({ card }: { card: KanbanCardData }) {
  const isOverdue = card.deadlineStatus === DeadlineStatus.OVERDUE;
  const isNoForecast = card.deadlineStatus === DeadlineStatus.NO_FORECAST;
  const hasSemanticLabel = isOverdue || card.deadlineIsDueToday || isNoForecast;
  const tone = isOverdue
    ? "rounded-md bg-error/10 px-1.5 py-0.5 text-error"
    : card.deadlineIsDueToday
      ? "rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-300"
      : isNoForecast
        ? "rounded-md bg-surface-container-low px-1.5 py-0.5 text-on-surface-variant"
        : "text-outline";
  const icon = isOverdue
    ? "warning"
    : card.deadlineIsDueToday
      ? "event"
      : isNoForecast
        ? "event_busy"
        : "calendar_today";

  return (
    <div className={`flex min-w-0 shrink-0 items-center gap-1 font-mono text-code-sm ${tone}`}>
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        {icon}
      </span>
      {hasSemanticLabel ? <span className="font-semibold">{card.deadlineStatusLabel}</span> : null}
      {card.expectedEndDate ? (
        <time dateTime={card.expectedEndDate}>{formatCivilDatePtBr(card.expectedEndDate)}</time>
      ) : null}
    </div>
  );
}

const CARD_SURFACE_CLASS =
  "group flex flex-col gap-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-space-md shadow-sm transition-all hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function cardDeadlineAccent(card: KanbanCardData): string {
  return card.deadlineStatus === DeadlineStatus.OVERDUE
    ? "border-l-4 border-l-error"
    : "";
}

/** Presentational card (T17 / lista de canceladas da T20). Sem DnD — pode ficar fora de DndContext. */
export function KanbanCard({ activity }: KanbanCardProps) {
  const card = toKanbanCard(activity);

  return (
    <Link
      href={`/activities/${card.activityId}`}
      className={`${CARD_SURFACE_CLASS} ${cardDeadlineAccent(card)}`}
    >
      <KanbanCardBody activity={activity} />
    </Link>
  );
}

function MoveSelect({
  activity,
  disabled,
  isOpen,
  onMove,
}: {
  activity: ActivityListItem;
  disabled: boolean;
  isOpen: boolean;
  onMove: (activityId: string, toStatus: ActivityStatus) => void;
}) {
  const card = toKanbanCard(activity);
  const destinations = KANBAN_COLUMN_STATUSES.filter((status) => status !== activity.status);

  return (
    <label
      className={`absolute inset-x-0 top-full z-30 flex flex-col gap-1 rounded-b-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-lg transition-opacity pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 ${
        isOpen ? "pointer-events-auto opacity-100" : ""
      }`}
    >
      <span className="text-label-sm text-on-surface-variant">Mover para</span>
      <select
        key={`${activity.id}-${activity.status}-${activity.version}`}
        defaultValue=""
        disabled={disabled}
        id={`kanban-move-${activity.id}`}
        aria-label={`Mover ${card.title} para`}
        className={`sr-only w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1.5 text-body-sm text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary group-hover:not-sr-only group-focus-within:not-sr-only ${
          isOpen ? "not-sr-only" : ""
        } disabled:cursor-not-allowed disabled:opacity-60`}
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
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
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
      className="mt-space-md ml-1 inline-flex size-11 shrink-0 cursor-grab touch-pan-y items-center justify-center rounded-lg text-outline hover:bg-surface-container-low hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
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
      className={`group relative flex flex-col rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md ${cardDeadlineAccent(
        card,
      )} ${isDragging ? "opacity-40" : ""}`}
    >
      <div
        {...listeners}
        className={`flex items-start gap-1 touch-pan-y active:cursor-grabbing ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
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
        <>
          <button
            type="button"
            className="pointer-events-none absolute right-1 top-1 z-20 inline-flex size-7 items-center justify-center rounded-lg bg-surface-container-lowest/90 text-on-surface-variant opacity-0 shadow-sm transition-opacity hover:bg-surface-container-high hover:text-on-surface focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pointer-coarse:pointer-events-auto pointer-coarse:opacity-100 any-pointer-coarse:pointer-events-auto any-pointer-coarse:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`${isMoveMenuOpen ? "Fechar" : "Mostrar"} controle Mover para de ${card.title}`}
            aria-controls={`kanban-move-${activity.id}`}
            aria-expanded={isMoveMenuOpen}
            disabled={disabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsMoveMenuOpen((open) => !open);
            }}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              swap_vert
            </span>
          </button>
          <MoveSelect
            activity={activity}
            disabled={disabled}
            isOpen={isMoveMenuOpen}
            onMove={(activityId, toStatus) => {
              setIsMoveMenuOpen(false);
              onMove(activityId, toStatus);
            }}
          />
        </>
      )}
    </article>
  );
}
