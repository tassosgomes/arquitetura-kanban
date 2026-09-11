import Link from "next/link";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ActivityStatusBadge } from "@/ui/activities/ActivityStatusBadge";
import { formatUserLabel } from "@/ui/projects/project-types";
import { ACTIVITY_TYPE_LABELS, canEditActivity } from "@/domain/activity/enums";
import type { ActivityListItem } from "@/application/activities";

type ActivityListProps = {
  activities: ActivityListItem[];
  emptyTitle: string;
  emptyMessage: string;
  createHref?: string;
  createLabel?: string;
  showProject?: boolean;
};

export function ActivityList({
  activities,
  emptyTitle,
  emptyMessage,
  createHref,
  createLabel = "Nova atividade",
  showProject = true,
}: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        action={
          createHref ? (
            <Link
              href={createHref}
              className="inline-flex rounded-xl bg-primary-container px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {createLabel}
            </Link>
          ) : null
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm">
      <table className="min-w-full text-left text-body-sm">
        <caption className="sr-only">Lista de atividades</caption>
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Título
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Tipo
            </th>
            {showProject ? (
              <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
                Projeto
              </th>
            ) : null}
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Responsável
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {activities.map((activity) => (
            <tr key={activity.id} className="transition-colors hover:bg-primary-container/5">
              <td className="px-4 py-3">
                <Link
                  href={`/activities/${activity.id}`}
                  className="font-semibold text-on-surface hover:text-primary"
                >
                  {activity.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <ActivityStatusBadge status={activity.status} />
              </td>
              <td className="px-4 py-3 text-on-surface-variant">{ACTIVITY_TYPE_LABELS[activity.type]}</td>
              {showProject ? (
                <td className="px-4 py-3 text-on-surface-variant">
                  {activity.project ? (
                    <Link
                      href={`/projects/${activity.project.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {activity.project.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              ) : null}
              <td className="px-4 py-3 text-on-surface-variant">
                {formatUserLabel(activity.owner)}
                {activity.owner.isActive ? null : " (inativo)"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <Link
                    href={`/activities/${activity.id}`}
                    className="rounded-md px-2 py-1 text-label-sm font-semibold text-primary hover:underline"
                  >
                    Ver
                  </Link>
                  {canEditActivity(activity.status) ? (
                    <Link
                      href={`/activities/${activity.id}/edit`}
                      className="rounded-md px-2 py-1 text-label-sm font-semibold text-primary hover:underline"
                    >
                      Editar
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
