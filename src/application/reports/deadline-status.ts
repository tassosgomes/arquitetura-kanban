import { ActivityStatus } from "@/domain/activity/enums";
import type { CivilDate } from "@/domain/calendar/civil-date";

/** Statuses used by the Book executive deadline column. */
export const DeadlineStatus = {
  NO_FORECAST: "NO_FORECAST",
  CANCELLED: "CANCELLED",
  ON_TIME: "ON_TIME",
  COMPLETED_LATE: "COMPLETED_LATE",
  OVERDUE: "OVERDUE",
  NOT_STARTED: "NOT_STARTED",
} as const;

export type DeadlineStatus = (typeof DeadlineStatus)[keyof typeof DeadlineStatus];

export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  [DeadlineStatus.NO_FORECAST]: "Sem previsão",
  [DeadlineStatus.CANCELLED]: "Cancelada",
  [DeadlineStatus.ON_TIME]: "No prazo",
  [DeadlineStatus.COMPLETED_LATE]: "Concluída com atraso",
  [DeadlineStatus.OVERDUE]: "Atrasado",
  [DeadlineStatus.NOT_STARTED]: "Não iniciada",
};

export type DeadlineStatusInput = {
  status: ActivityStatus;
  expectedEndDate: CivilDate | null;
  completedDate: CivilDate | null;
  today: CivilDate;
};

/**
 * Classifies an activity using the Book executive §4 rule.
 *
 * Civil dates are ISO `YYYY-MM-DD` values, so their lexical order is their
 * calendar order. The condition order is intentional and part of the rule.
 */
export function classifyDeadlineStatus(input: DeadlineStatusInput): DeadlineStatus {
  const { status, expectedEndDate, completedDate, today } = input;

  if (expectedEndDate === null) {
    return DeadlineStatus.NO_FORECAST;
  }

  if (status === ActivityStatus.CANCELLED) {
    return DeadlineStatus.CANCELLED;
  }

  if (status === ActivityStatus.DONE && completedDate !== null) {
    return completedDate <= expectedEndDate
      ? DeadlineStatus.ON_TIME
      : DeadlineStatus.COMPLETED_LATE;
  }

  if (expectedEndDate < today) {
    return DeadlineStatus.OVERDUE;
  }

  if (status === ActivityStatus.BACKLOG || status === ActivityStatus.TODO) {
    return DeadlineStatus.NOT_STARTED;
  }

  return DeadlineStatus.ON_TIME;
}
