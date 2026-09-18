import type { DeadlineStatus } from "@/application/reports/deadline-status";

const TONES: Record<DeadlineStatus, string> = {
  NO_FORECAST: "bg-surface-container-high text-on-surface-variant",
  CANCELLED: "bg-error-container text-on-error-container",
  ON_TIME: "bg-tertiary-fixed text-on-tertiary-fixed",
  COMPLETED_LATE: "bg-secondary-container/20 text-secondary",
  OVERDUE: "bg-error/10 text-error",
  NOT_STARTED: "bg-primary-container/10 text-primary",
};

export function DeadlineBadge({
  status,
  label,
}: {
  status: DeadlineStatus;
  label: string;
}) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-label-sm font-semibold ${TONES[status]}`}>
      {label}
    </span>
  );
}
