import type { DeadlineStatus } from "@/application/reports/deadline-status";

const TONES: Record<DeadlineStatus, string> = {
  NO_FORECAST: "bg-surface-container-high text-on-surface-variant",
  CANCELLED: "bg-error-container text-on-error-container",
  ON_TIME: "bg-tertiary-fixed text-on-tertiary-fixed",
  COMPLETED_LATE: "bg-secondary-container/20 text-secondary",
  OVERDUE: "bg-error/10 text-error",
  NOT_STARTED: "bg-primary-container/10 text-primary",
};

export const DEADLINE_STATUS_ICON: Record<DeadlineStatus, string> = {
  ON_TIME: "check_circle",
  OVERDUE: "cancel",
  NOT_STARTED: "schedule",
  COMPLETED_LATE: "event_available",
  NO_FORECAST: "remove",
  CANCELLED: "do_not_disturb_on",
};

// Only used inside the Book (BookAreaPage, BookLegend) — confirmed via
// `grep -rn "DeadlineBadge" src`, so the icon is always shown, no opt-in flag.
export function DeadlineBadge({
  status,
  label,
}: {
  status: DeadlineStatus;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${TONES[status]}`}
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        {DEADLINE_STATUS_ICON[status]}
      </span>
      {label}
    </span>
  );
}
