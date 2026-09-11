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
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              {createLabel}
            </Link>
          ) : null
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Lista de atividades</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Título
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Tipo
            </th>
            {showProject ? (
              <th scope="col" className="px-4 py-3 font-medium">
                Projeto
              </th>
            ) : null}
            <th scope="col" className="px-4 py-3 font-medium">
              Responsável
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td className="px-4 py-3">
                <Link
                  href={`/activities/${activity.id}`}
                  className="font-medium text-zinc-900 underline hover:text-zinc-700"
                >
                  {activity.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <ActivityStatusBadge status={activity.status} />
              </td>
              <td className="px-4 py-3 text-zinc-700">{ACTIVITY_TYPE_LABELS[activity.type]}</td>
              {showProject ? (
                <td className="px-4 py-3 text-zinc-700">
                  {activity.project ? (
                    <Link
                      href={`/projects/${activity.project.id}`}
                      className="underline hover:text-zinc-900"
                    >
                      {activity.project.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              ) : null}
              <td className="px-4 py-3 text-zinc-700">
                {formatUserLabel(activity.owner)}
                {activity.owner.isActive ? null : " (inativo)"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/activities/${activity.id}`}
                    className="rounded-md px-2 py-1 text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
                  >
                    Ver
                  </Link>
                  {canEditActivity(activity.status) ? (
                    <Link
                      href={`/activities/${activity.id}/edit`}
                      className="rounded-md px-2 py-1 text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
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
