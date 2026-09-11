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
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-code-sm">
            <Link href="/projects" className="font-semibold text-primary hover:underline">
              Projetos
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-headline-lg text-on-surface">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
        {editable ? (
          <Link
            href={`/projects/${project.id}/edit`}
            className="inline-flex shrink-0 rounded-xl bg-primary-container px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
