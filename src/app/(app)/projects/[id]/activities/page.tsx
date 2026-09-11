import Link from "next/link";
import { notFound } from "next/navigation";
import { listActivities } from "@/application/activities";
import { getProject } from "@/application/projects";
import { canEditProject } from "@/domain/project/project-status";
import {
  activityRepository,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { ActivityList } from "@/ui/activities/ActivityList";

type ProjectActivitiesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectActivitiesPage({ params }: ProjectActivitiesPageProps) {
  const { id } = await params;
  const actor = await requireActiveUser();
  const project = await getProject(actor, id, projectRepository);

  if (!project) {
    notFound();
  }

  const activities = await listActivities(
    actor,
    { projectId: project.id, includeCancelled: true },
    activityRepository,
  );
  const canCreate = canEditProject(project.status);

  return (
    <div className="flex flex-col gap-4">
      {canCreate ? (
        <div className="flex justify-end">
          <Link
            href={`/activities/new?projectId=${project.id}`}
            className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Nova atividade vinculada
          </Link>
        </div>
      ) : (
        <p className="text-sm text-zinc-600">
          Projeto cancelado: novas atividades não podem ser vinculadas a ele.
        </p>
      )}
      <ActivityList
        activities={activities}
        emptyTitle="Nenhuma atividade neste projeto"
        emptyMessage="Crie uma atividade vinculada para acompanhar o trabalho de Arquitetura nesta iniciativa."
        createHref={canCreate ? `/activities/new?projectId=${project.id}` : undefined}
        createLabel="Nova atividade vinculada"
        showProject={false}
      />
    </div>
  );
}
