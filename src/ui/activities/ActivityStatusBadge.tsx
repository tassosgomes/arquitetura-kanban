import { ACTIVITY_STATUS_LABELS, type ActivityStatus } from "@/domain/activity/enums";

export const ACTIVITY_STATUS_TONE: Record<ActivityStatus, string> = {
  BACKLOG: "bg-surface-container-high text-on-surface-variant",
  TODO: "bg-secondary-fixed text-on-secondary-fixed",
  IN_PROGRESS: "bg-primary-container text-on-primary",
  WAITING: "bg-secondary-container/20 text-secondary",
  BLOCKED: "bg-error/10 text-error",
  DONE: "bg-tertiary-fixed text-on-tertiary-fixed",
  CANCELLED: "bg-error-container text-on-error-container",
};

export const ACTIVITY_STATUS_DOT: Record<ActivityStatus, string> = {
  BACKLOG: "bg-outline",
  TODO: "bg-secondary",
  IN_PROGRESS: "bg-primary",
  WAITING: "bg-secondary-container",
  BLOCKED: "bg-error",
  DONE: "bg-tertiary",
  CANCELLED: "bg-error",
};

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-sm font-semibold ${ACTIVITY_STATUS_TONE[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ACTIVITY_STATUS_DOT[status]}`} aria-hidden="true" />
      {ACTIVITY_STATUS_LABELS[status]}
    </span>
  );
}
