import { notFound } from "next/navigation";
import { listProjectHistory } from "@/application/projects/queries/list-project-history";
import { getProject } from "@/application/projects";
import {
  activityRepository,
  areaRepository,
  auditRepository,
  catalogUserRepository,
  domainRepository,
  projectRepository,
  requireActiveUser,
  valueDeliveryRepository,
} from "@/infrastructure/composition";
import { ProjectHistory } from "@/ui/projects/ProjectHistory";

type ProjectHistoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectHistoryPage({ params }: ProjectHistoryPageProps) {
  const { id } = await params;
  const actor = await requireActiveUser();
  const project = await getProject(actor, id, projectRepository);

  if (!project) {
    notFound();
  }

  const history = await listProjectHistory(
    actor,
    { projectId: project.id },
    {
      projects: projectRepository,
      activities: activityRepository,
      valueDeliveries: valueDeliveryRepository,
      audit: auditRepository,
      users: catalogUserRepository,
      areas: areaRepository,
      domains: domainRepository,
    },
  );

  return <ProjectHistory projectId={project.id} initialPage={history} />;
}
