import { Temporal } from "@js-temporal/polyfill";
import {
  classifyDeadlineStatus,
  DEADLINE_STATUS_LABELS,
  DeadlineStatus,
  type DeadlineStatus as DeadlineStatusValue,
} from "@/application/reports/deadline-status";
import {
  ACTIVITY_STATUS_LABELS,
  ActivityStatus,
  isKanbanColumnStatus,
  KANBAN_COLUMN_STATUSES,
} from "@/domain/activity/enums";
import {
  ARCHITECTURE_ROLE_LABELS,
  EFFORT_LABELS,
  PRIORITY_LABELS,
} from "@/domain/catalog/classifications";
import type { CivilDate } from "@/domain/calendar/civil-date";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";
import type { ActivityListItem, ActivityUserRef } from "@/application/activities/types";

/** RN-01: um único board da equipe. Período e pessoa são filtros (T19/T20), não boards. */
export const KANBAN_BOARD_SCOPE = "team" as const;

export type KanbanColumnStatus = (typeof KANBAN_COLUMN_STATUSES)[number];

export type KanbanColumn = {
  status: KanbanColumnStatus;
  label: string;
  activities: ActivityListItem[];
};

export type KanbanCardData = {
  activityId: string;
  title: string;
  projectName: string | null;
  areaLabel: string;
  ownerLabel: string;
  priorityLabel: string;
  effortLabel: string | null;
  roleLabel: string;
  checklistLabel: string | null;
  expectedEndDate: string | null;
  deadlineStatus: DeadlineStatusValue;
  deadlineStatusLabel: string;
  deadlineDaysLate: number | null;
  deadlineIsDueToday: boolean;
};

/** Returns the current civil day in the project's calendar, never the browser's local day. */
export function todayInProjectTimeZone(now?: Date): CivilDate {
  const instant = now
    ? Temporal.Instant.fromEpochMilliseconds(now.getTime())
    : Temporal.Now.instant();
  return instant.toZonedDateTimeISO(APP_TIME_ZONE).toPlainDate().toString();
}

function daysLate(expectedEndDate: CivilDate, today: CivilDate): number {
  return Temporal.PlainDate.from(today).since(Temporal.PlainDate.from(expectedEndDate), {
    largestUnit: "days",
  }).days;
}

function formatDeadlineStatusLabel(
  status: DeadlineStatusValue,
  deadlineIsDueToday: boolean,
  deadlineDaysLate: number | null,
): string {
  if (deadlineIsDueToday) {
    return "Vence hoje";
  }

  if (status === DeadlineStatus.OVERDUE && deadlineDaysLate !== null) {
    return `Atrasado há ${deadlineDaysLate} ${deadlineDaysLate === 1 ? "dia" : "dias"}`;
  }

  return DEADLINE_STATUS_LABELS[status];
}

function ownerLabel(owner: ActivityUserRef): string {
  const name = owner.displayName ?? owner.email ?? "Sem identificação";
  return owner.isActive ? name : `${name} (inativo)`;
}

/** RN-02: um card = uma atividade, com os campos essenciais do PRD §13.2. */
export function toKanbanCard(
  activity: ActivityListItem,
  today: CivilDate = todayInProjectTimeZone(),
): KanbanCardData {
  const areaName = activity.requestingArea.name;
  const deadlineStatus = classifyDeadlineStatus({
    status: activity.status,
    expectedEndDate: activity.expectedEndDate,
    completedDate: activity.completedDate,
    today,
  });
  const deadlineIsDueToday =
    activity.expectedEndDate === today &&
    activity.status !== ActivityStatus.DONE &&
    activity.status !== ActivityStatus.CANCELLED;
  const deadlineDaysLate =
    deadlineStatus === DeadlineStatus.OVERDUE && activity.expectedEndDate !== null
      ? daysLate(activity.expectedEndDate, today)
      : null;

  return {
    activityId: activity.id,
    title: activity.title,
    projectName: activity.project?.name ?? null,
    areaLabel: activity.requestingArea.isActive ? areaName : `${areaName} (inativa)`,
    ownerLabel: ownerLabel(activity.owner),
    priorityLabel: PRIORITY_LABELS[activity.priority],
    effortLabel: activity.effort ? EFFORT_LABELS[activity.effort] : null,
    roleLabel: ARCHITECTURE_ROLE_LABELS[activity.architectureRole],
    checklistLabel:
      activity.checklistTotalCount > 0
        ? `${activity.checklistDoneCount}/${activity.checklistTotalCount}`
        : null,
    expectedEndDate: activity.expectedEndDate,
    deadlineStatus,
    deadlineStatusLabel: formatDeadlineStatusLabel(
      deadlineStatus,
      deadlineIsDueToday,
      deadlineDaysLate,
    ),
    deadlineDaysLate,
    deadlineIsDueToday,
  };
}

/**
 * Monta as seis colunas padrão. Cancelado nunca vira coluna (RN-10);
 * itens cancelados ou com status fora do board são ignorados.
 */
export function buildKanbanBoard(activities: readonly ActivityListItem[]): KanbanColumn[] {
  const byStatus = new Map<ActivityStatus, ActivityListItem[]>();
  for (const status of KANBAN_COLUMN_STATUSES) {
    byStatus.set(status, []);
  }

  for (const activity of activities) {
    const column = byStatus.get(activity.status);
    if (column) {
      column.push(activity);
    }
  }

  return KANBAN_COLUMN_STATUSES.map((status) => ({
    status,
    label: ACTIVITY_STATUS_LABELS[status],
    activities: byStatus.get(status) ?? [],
  }));
}

/** Prefix for column droppable ids so they never collide with activity UUIDs. */
export const KANBAN_COLUMN_DROPPABLE_PREFIX = "kanban-column:" as const;

export function kanbanColumnDroppableId(status: ActivityStatus): string {
  return `${KANBAN_COLUMN_DROPPABLE_PREFIX}${status}`;
}

export function parseKanbanColumnDroppableId(id: string): KanbanColumnStatus | null {
  if (!id.startsWith(KANBAN_COLUMN_DROPPABLE_PREFIX)) {
    return null;
  }
  const status = id.slice(KANBAN_COLUMN_DROPPABLE_PREFIX.length);
  return isKanbanColumnStatus(status as ActivityStatus) ? (status as KanbanColumnStatus) : null;
}

/**
 * Drop target is a column, or a card already in a column (pointer over a sibling).
 * Cancelled / unknown ids are not valid destinations.
 */
export function resolveKanbanDropStatus(
  overId: string | number | null | undefined,
  activities: readonly ActivityListItem[],
): KanbanColumnStatus | null {
  if (overId == null) {
    return null;
  }
  const id = String(overId);
  const fromColumn = parseKanbanColumnDroppableId(id);
  if (fromColumn) {
    return fromColumn;
  }
  const activity = activities.find((item) => item.id === id);
  if (!activity || !isKanbanColumnStatus(activity.status)) {
    return null;
  }
  return activity.status;
}

export function adjacentKanbanColumnStatus(
  current: ActivityStatus,
  direction: -1 | 1,
): KanbanColumnStatus | null {
  const index = KANBAN_COLUMN_STATUSES.indexOf(current as KanbanColumnStatus);
  if (index < 0) {
    return null;
  }
  return KANBAN_COLUMN_STATUSES[index + direction] ?? null;
}

/** Payload for `changeActivityStatus` (T14). Same-column is a no-op: no ranking (PRD). */
export type KanbanStatusMove = {
  id: string;
  version: number;
  status: KanbanColumnStatus;
};

export function planKanbanStatusMove(
  activities: readonly ActivityListItem[],
  activityId: string,
  toStatus: ActivityStatus,
): KanbanStatusMove | null {
  const activity = activities.find((item) => item.id === activityId);
  if (!activity) {
    return null;
  }
  if (!isKanbanColumnStatus(toStatus)) {
    return null;
  }
  if (activity.status === toStatus) {
    return null;
  }
  if (activity.status === ActivityStatus.CANCELLED) {
    return null;
  }
  return { id: activity.id, version: activity.version, status: toStatus };
}

/** Optimistic board update. Does not reorder siblings in the source list. */
export function applyKanbanStatusMove(
  activities: readonly ActivityListItem[],
  activityId: string,
  toStatus: ActivityStatus,
): ActivityListItem[] {
  return activities.map((activity) =>
    activity.id === activityId ? { ...activity, status: toStatus } : activity,
  );
}
