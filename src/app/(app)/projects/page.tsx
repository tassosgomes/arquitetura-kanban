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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Projetos</h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Cadastre iniciativas com área responsável, papéis da Arquitetura, natureza e status
            independente das atividades.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
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
