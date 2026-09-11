import { Suspense } from "react";
import Link from "next/link";
import { listProjects, type ProjectListFilter } from "@/application/projects";
import { projectRepository, requireActiveUser } from "@/infrastructure/composition";
import { ProjectFilterTabs } from "@/ui/projects/ProjectFilterTabs";
import { ProjectList } from "@/ui/projects/ProjectList";

type ProjectsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

function parseFilter(status: string | undefined): ProjectListFilter {
  if (status === "cancelled" || status === "all") {
    return status;
  }
  return "active";
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { status } = await searchParams;
  const filter = parseFilter(status);
  const actor = await requireActiveUser();
  const projects = await listProjects(actor, filter, projectRepository);

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-lg text-on-surface">Projetos</h1>
          <p className="max-w-2xl text-body-md leading-6 text-on-surface-variant">
            Cadastre iniciativas com área responsável, papéis da Arquitetura, natureza e status
            independente das atividades.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary-container px-space-md py-2.5 text-label-md font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            add_circle
          </span>
          Novo projeto
        </Link>
      </header>
      <Suspense fallback={null}>
        <ProjectFilterTabs />
      </Suspense>
      <ProjectList projects={projects} filter={filter} />
    </div>
  );
}
