import Link from "next/link";
import { toKanbanCard, type ActivityListItem, type KanbanCardData } from "@/application/activities";
import { formatCivilDatePtBr } from "@/ui/projects/project-types";

type KanbanCardProps = {
  activity: ActivityListItem;
};

function metaLine(card: KanbanCardData): string {
  return [card.priorityLabel, card.effortLabel, card.roleLabel]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function KanbanCard({ activity }: KanbanCardProps) {
  const card = toKanbanCard(activity);

  return (
    <Link
      href={`/activities/${card.activityId}`}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
    >
      <h3 className="text-sm font-medium leading-5 text-zinc-900">{card.title}</h3>
      {card.projectName ? <p className="text-xs leading-4 text-zinc-600">{card.projectName}</p> : null}
      <p className="text-xs leading-4 text-zinc-700">
        {card.areaLabel} · {card.ownerLabel}
      </p>
      <p className="text-xs leading-4 text-zinc-700">{metaLine(card)}</p>
      {card.checklistLabel || card.expectedEndDate ? (
        <p className="flex items-center justify-between gap-2 text-xs leading-4 text-zinc-600">
          {card.checklistLabel ? (
            <span>
              <span className="sr-only">Checklist </span>
              {card.checklistLabel}
            </span>
          ) : (
            <span />
          )}
          {card.expectedEndDate ? (
            <time dateTime={card.expectedEndDate}>{formatCivilDatePtBr(card.expectedEndDate)}</time>
          ) : null}
        </p>
      ) : null}
    </Link>
  );
}
