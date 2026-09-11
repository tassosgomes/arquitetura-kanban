import Link from "next/link";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ProjectStatusBadge } from "@/ui/projects/ProjectStatusBadge";
import { formatUserLabel } from "@/ui/projects/project-types";
import type { ProjectListItem } from "@/application/projects";
import { canEditProject } from "@/domain/project/project-status";

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
        : "Cadastre projetos com área, responsáveis, participantes e datas para vincular atividades de arquitetura.";

    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        action={
          filter === "cancelled" ? null : (
            <Link
              href="/projects/new"
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              Novo projeto
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Lista de projetos</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Nome
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Área
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Responsável
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {projects.map((project) => (
            <tr key={project.id}>
              <td className="px-4 py-3">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-zinc-900 underline hover:text-zinc-700"
                >
                  {project.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <ProjectStatusBadge status={project.status} />
              </td>
              <td className="px-4 py-3 text-zinc-700">
                {project.responsibleArea.name}
                {project.responsibleArea.isActive ? null : " (inativa)"}
              </td>
              <td className="px-4 py-3 text-zinc-700">
                {formatUserLabel(project.architectureOwner)}
                {project.architectureOwner.isActive ? null : " (inativo)"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="rounded-md px-2 py-1 text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
                  >
                    Ver
                  </Link>
                  {canEditProject(project.status) ? (
                    <Link
                      href={`/projects/${project.id}/edit`}
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
