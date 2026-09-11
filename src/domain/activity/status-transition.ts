import { ActivityStatus, isKanbanColumnStatus } from "@/domain/activity/enums";
import { InvariantError } from "@/domain/errors";
import { resolveStartDateForDestination } from "@/domain/activity/auto-start-date";

/** Explicit “Reabrir” without a destination (DE-06). */
export const DEFAULT_REOPEN_STATUS = ActivityStatus.IN_PROGRESS;

export type ActivityLifecycleDates = {
  startDate: string | null;
  completedDate: string | null;
  cancelledDate: string | null;
};

export function isActivityReopening(from: ActivityStatus, to: ActivityStatus): boolean {
  return from === ActivityStatus.DONE && isKanbanColumnStatus(to) && to !== ActivityStatus.DONE;
}

export function isActivityCancellation(from: ActivityStatus, to: ActivityStatus): boolean {
  return from !== ActivityStatus.CANCELLED && to === ActivityStatus.CANCELLED;
}

export function isStatusTransitionNoOp(from: ActivityStatus, to: ActivityStatus): boolean {
  return from === to;
}

/**
 * Matrix §7: any board status ↔ any board status; Cancelled from any non-cancelled;
 * Cancelled is terminal (DE-07 / RN-10). Same-status is a no-op, not an error.
 */
export function assertStatusTransitionAllowed(from: ActivityStatus, to: ActivityStatus): void {
  if (from === to) {
    return;
  }
  if (from === ActivityStatus.CANCELLED) {
    throw new InvariantError("Atividade cancelada não pode mudar de status.");
  }
}

export function applyStatusTransitionDates(input: {
  from: ActivityStatus;
  to: ActivityStatus;
  dates: ActivityLifecycleDates;
  today: string;
}): ActivityLifecycleDates {
  const { from, to, today } = input;
  let { startDate, completedDate, cancelledDate } = input.dates;

  if (isActivityReopening(from, to)) {
    completedDate = null;
  }

  startDate = resolveStartDateForDestination(to, startDate, today);

  if (to === ActivityStatus.DONE) {
    completedDate = today;
  }

  if (to === ActivityStatus.CANCELLED) {
    cancelledDate = today;
  }

  assertLifecycleDates({ startDate, completedDate, cancelledDate }, today);

  return { startDate, completedDate, cancelledDate };
}

export function assertLifecycleDates(dates: ActivityLifecycleDates, today: string): void {
  if (dates.completedDate && dates.completedDate > today) {
    throw new InvariantError("A data de conclusão não pode ser futura.");
  }
  if (dates.cancelledDate && dates.cancelledDate > today) {
    throw new InvariantError("A data de cancelamento não pode ser futura.");
  }
  if (dates.startDate && dates.completedDate && dates.completedDate < dates.startDate) {
    throw new InvariantError("A data de conclusão não pode ser anterior à data de início.");
  }
  if (dates.startDate && dates.cancelledDate && dates.cancelledDate < dates.startDate) {
    throw new InvariantError("A data de cancelamento não pode ser anterior à data de início.");
  }
}
