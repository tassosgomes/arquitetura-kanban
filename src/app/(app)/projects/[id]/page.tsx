import { notFound } from "next/navigation";
import { getProject } from "@/application/projects";
import { projectRepository, requireActiveUser } from "@/infrastructure/composition";
import { ProjectOverview } from "@/ui/projects/ProjectOverview";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectOverviewPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const actor = await requireActiveUser();
  const project = await getProject(actor, id, projectRepository);

  if (!project) {
    notFound();
  }

  return <ProjectOverview project={project} />;
}
