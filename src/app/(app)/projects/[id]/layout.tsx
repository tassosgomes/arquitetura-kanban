import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/application/projects";
import { canEditProject } from "@/domain/project/project-status";
import { projectRepository, requireActiveUser } from "@/infrastructure/composition";
import { ProjectStatusBadge } from "@/ui/projects/ProjectStatusBadge";
import { ProjectTabs } from "@/ui/projects/ProjectTabs";

type ProjectLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ProjectSectionLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params;
  const actor = await requireActiveUser();
  const project = await getProject(actor, id, projectRepository);

  if (!project) {
    notFound();
  }

  const editable = canEditProject(project.status);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            <Link href="/projects" className="font-medium text-zinc-700 underline hover:text-zinc-900">
              Projetos
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
        {editable ? (
          <Link
            href={`/projects/${project.id}/edit`}
            className="inline-flex shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Editar
          </Link>
        ) : null}
      </header>
      <ProjectTabs projectId={project.id} />
      {children}
    </div>
  );
}
