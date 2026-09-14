import Link from "next/link";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ProjectStatusBadge } from "@/ui/projects/ProjectStatusBadge";
import type { ProjectListItem } from "@/application/projects";
import { canEditProject } from "@/domain/project/project-status";
import { ARCHITECTURE_GROUP_LABEL } from "@/domain/catalog/architecture-group";

type ProjectListProps = {
  projects: ProjectListItem[];
  filter: "active" | "cancelled" | "all";
};

export function ProjectList({ projects, filter }: ProjectListProps) {
  if (projects.length === 0) {
    const emptyTitle =
      filter === "cancelled" ? "Nenhum projeto cancelado" : "Nenhum projeto cadastrado";
    const emptyMessage =
      filter === "cancelled"
        ? "Projetos cancelados permanecem visíveis para consulta e não são excluídos."
        : "Cadastre projetos com área, grupo Arquitetura, participantes e datas para vincular atividades de arquitetura.";

    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        action={
          filter === "cancelled" ? null : (
            <Link
              href="/projects/new"
              className="inline-flex rounded-xl bg-primary-container px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Novo projeto
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm">
      <table className="min-w-full text-left text-body-sm">
        <caption className="sr-only">Lista de projetos</caption>
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Nome
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Área
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Responsável
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {projects.map((project) => (
            <tr key={project.id} className="transition-colors hover:bg-primary-container/5">
              <td className="px-4 py-3">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-semibold text-on-surface hover:text-primary"
                >
                  {project.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <ProjectStatusBadge status={project.status} />
              </td>
              <td className="px-4 py-3 text-on-surface-variant">
                {project.responsibleArea.name}
                {project.responsibleArea.isActive ? null : " (inativa)"}
              </td>
              <td className="px-4 py-3 text-on-surface-variant">
                {ARCHITECTURE_GROUP_LABEL}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <Link
                    href={`/projects/${project.id}`}
                    className="rounded-md px-2 py-1 text-label-sm font-semibold text-primary hover:underline"
                  >
                    Ver
                  </Link>
                  {canEditProject(project.status) ? (
                    <Link
                      href={`/projects/${project.id}/edit`}
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
