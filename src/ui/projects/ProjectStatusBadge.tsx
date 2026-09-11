import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/domain/project/project-status";

const TONE: Record<ProjectStatus, string> = {
  PLANNED: "bg-surface-container-high text-on-surface-variant",
  IN_PROGRESS: "bg-primary-fixed text-on-primary-fixed",
  COMPLETED: "bg-tertiary-fixed text-on-tertiary-fixed",
  CANCELLED: "bg-error-container text-on-error-container",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-sm font-semibold ${TONE[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
