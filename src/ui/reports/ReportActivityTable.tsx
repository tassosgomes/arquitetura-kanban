import Link from "next/link";
import { formatCivilDatePtBr } from "@/application/reports/period-view";
import type { AssociatedProject, ManagementReportRow } from "@/application/reports/report-rows";
import { ActivityStatusBadge } from "@/ui/activities/ActivityStatusBadge";
import { EmptyState } from "@/ui/feedback/EmptyState";

function cell(value: string): string {
  return value === "" ? "—" : value;
}

function dateCell(value: string): string {
  return value === "" ? "—" : formatCivilDatePtBr(value);
}

type ReportActivityTableProps = {
  activities: ManagementReportRow[];
  emptyMessage: string;
};

export function ReportActivityTable({ activities, emptyMessage }: ReportActivityTableProps) {
  if (activities.length === 0) {
    return <EmptyState title="Nenhuma atividade nesta página" message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Atividades da população no retrato do fechamento</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Título
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Tipo
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status (retrato)
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Projeto
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Área solicitante
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Responsável
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Início
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Conclusão
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
                  {activity.title || activity.id}
                </Link>
              </td>
              <td className="px-4 py-3 text-zinc-700">{cell(activity.type)}</td>
              <td className="px-4 py-3">
                {activity.statusKey ? (
                  <ActivityStatusBadge status={activity.statusKey} />
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-700">
                {activity.projectId ? (
                  <Link
                    href={`/projects/${activity.projectId}`}
                    className="underline hover:text-zinc-900"
                  >
                    {cell(activity.project)}
                  </Link>
                ) : (
                  cell(activity.project)
                )}
              </td>
              <td className="px-4 py-3 text-zinc-700">{cell(activity.requestingArea)}</td>
              <td className="px-4 py-3 text-zinc-700">{cell(activity.owner)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{dateCell(activity.startDate)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-zinc-700">
                {dateCell(activity.completedDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type AssociatedProjectsListProps = {
  projects: AssociatedProject[];
};

export function AssociatedProjectsList({ projects }: AssociatedProjectsListProps) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="relatorio-projetos">
      <h2 id="relatorio-projetos" className="text-lg font-semibold text-zinc-900">
        Projetos associados
      </h2>
      {projects.length === 0 ? (
        <p className="text-sm text-zinc-600">Nenhum projeto vinculado no retrato deste recorte.</p>
      ) : (
        <ul className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="font-medium text-zinc-900 underline hover:text-zinc-700"
              >
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
