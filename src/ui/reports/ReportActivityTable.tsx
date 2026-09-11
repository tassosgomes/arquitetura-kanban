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
    <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm">
      <table className="min-w-full text-left text-body-sm">
        <caption className="sr-only">Atividades da população no retrato do fechamento</caption>
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Título
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Tipo
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Status (retrato)
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Projeto
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Área solicitante
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Responsável
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Início
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Conclusão
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
                  {activity.title || activity.id}
                </Link>
              </td>
              <td className="px-4 py-3 text-on-surface-variant">{cell(activity.type)}</td>
              <td className="px-4 py-3">
                {activity.statusKey ? (
                  <ActivityStatusBadge status={activity.statusKey} />
                ) : (
                  <span className="text-outline">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-on-surface-variant">
                {activity.projectId ? (
                  <Link
                    href={`/projects/${activity.projectId}`}
                    className="hover:text-primary hover:underline"
                  >
                    {cell(activity.project)}
                  </Link>
                ) : (
                  cell(activity.project)
                )}
              </td>
              <td className="px-4 py-3 text-on-surface-variant">{cell(activity.requestingArea)}</td>
              <td className="px-4 py-3 text-on-surface-variant">{cell(activity.owner)}</td>
              <td className="px-4 py-3 whitespace-nowrap font-mono text-code-sm text-on-surface-variant">
                {dateCell(activity.startDate)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap font-mono text-code-sm text-on-surface-variant">
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
      <h2 id="relatorio-projetos" className="text-headline-md text-on-surface">
        Projetos associados
      </h2>
      {projects.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">
          Nenhum projeto vinculado no retrato deste recorte.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 rounded-xl bg-surface-container-lowest px-4 py-3 text-body-sm shadow-sm">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="font-semibold text-primary hover:underline"
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
