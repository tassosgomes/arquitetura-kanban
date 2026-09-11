import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/domain/project/project-status";

const TONE: Record<ProjectStatus, string> = {
  PLANNED: "bg-zinc-100 text-zinc-700",
  IN_PROGRESS: "bg-sky-50 text-sky-800",
  COMPLETED: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-red-50 text-red-800",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
