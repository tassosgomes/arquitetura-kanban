import { ACTIVITY_STATUS_LABELS, type ActivityStatus } from "@/domain/activity/enums";

const TONE: Record<ActivityStatus, string> = {
  BACKLOG: "bg-zinc-100 text-zinc-700",
  TODO: "bg-slate-100 text-slate-800",
  IN_PROGRESS: "bg-sky-50 text-sky-800",
  WAITING: "bg-amber-50 text-amber-900",
  BLOCKED: "bg-orange-50 text-orange-900",
  DONE: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-red-50 text-red-800",
};

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {ACTIVITY_STATUS_LABELS[status]}
    </span>
  );
}
