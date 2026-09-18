import type { ReactElement } from "react";
import { ACTIVITY_STATUS_ICON } from "@/ui/activities/ActivityStatusBadge";
import { ACTIVITY_STATUS_LABELS, ActivityStatus } from "@/domain/activity/enums";
import { PRIORITY_ICON } from "@/ui/reports/executive/PriorityBadge";
import { PRIORITY_LABELS, Priority } from "@/domain/catalog/classifications";
import { DEADLINE_STATUS_ICON } from "@/ui/reports/executive/DeadlineBadge";
import { DEADLINE_STATUS_LABELS, DeadlineStatus } from "@/application/reports/deadline-status";

const PRIORITY_ORDER: readonly Priority[] = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
const STATUS_ORDER: readonly ActivityStatus[] = Object.values(ActivityStatus);
const DEADLINE_ORDER: readonly DeadlineStatus[] = Object.keys(DEADLINE_STATUS_LABELS) as DeadlineStatus[];

function LegendColumn({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{ key: string; icon: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-label-sm font-semibold uppercase tracking-wider text-outline">{title}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact, single legend for the Book's footer, reusing the badges' own icon maps (no literal duplication). */
export function BookIconLegend(): ReactElement {
  return (
    <section
      className="print:break-inside-avoid rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
      aria-labelledby="book-icon-legend"
    >
      <h3 id="book-icon-legend" className="text-headline-sm text-on-surface">
        Legenda de ícones
      </h3>
      <div className="mt-3 grid gap-space-md sm:grid-cols-3">
        <LegendColumn
          title="Prioridade"
          items={PRIORITY_ORDER.map((priority) => ({
            key: priority,
            icon: PRIORITY_ICON[priority],
            label: PRIORITY_LABELS[priority],
          }))}
        />
        <LegendColumn
          title="Status"
          items={STATUS_ORDER.map((status) => ({
            key: status,
            icon: ACTIVITY_STATUS_ICON[status],
            label: ACTIVITY_STATUS_LABELS[status],
          }))}
        />
        <LegendColumn
          title="Status prazo"
          items={DEADLINE_ORDER.map((status) => ({
            key: status,
            icon: DEADLINE_STATUS_ICON[status],
            label: DEADLINE_STATUS_LABELS[status],
          }))}
        />
      </div>
    </section>
  );
}
