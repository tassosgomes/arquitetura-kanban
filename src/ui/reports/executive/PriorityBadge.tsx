import { PRIORITY_LABELS, Priority } from "@/domain/catalog/classifications";

export const PRIORITY_ICON: Record<Priority, string> = {
  CRITICAL: "rocket_launch",
  HIGH: "keyboard_double_arrow_up",
  MEDIUM: "flag",
  LOW: "bar_chart",
};

const PRIORITY_TONE: Record<Priority, string> = {
  CRITICAL: "text-error",
  HIGH: "text-secondary",
  MEDIUM: "text-on-surface-variant",
  LOW: "text-outline",
};

/**
 * `priority` is the pt-BR label and `priorityKey` the enum it came from. The
 * key picks the icon so the badge never depends on the label's wording; the
 * label is still what the reader sees.
 */
export function PriorityBadge({
  priority,
  label,
}: {
  priority: Priority | null;
  label?: string;
}) {
  const text = label || (priority ? PRIORITY_LABELS[priority] : "");

  if (!priority) {
    return <span className="text-on-surface-variant">{text || "—"}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${PRIORITY_TONE[priority]}`}>
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        {PRIORITY_ICON[priority]}
      </span>
      {text}
    </span>
  );
}
