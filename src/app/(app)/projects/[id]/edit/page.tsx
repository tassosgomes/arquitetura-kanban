import Link from "next/link";
import { notFound } from "next/navigation";
import { listActiveAreas, listActiveUsers } from "@/application/catalogs";
import { getProject } from "@/application/projects";
import { canEditProject } from "@/domain/project/project-status";
import {
  areaRepository,
  catalogUserRepository,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { updateProjectAction } from "@/app/actions/projects";
import { ErrorState } from "@/ui/feedback/ErrorState";
import { ProjectForm } from "@/ui/projects/ProjectForm";
import type { ProjectOption, ProjectUserOption } from "@/ui/projects/project-types";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

function mergeArea(active: ProjectOption[], current: ProjectOption): ProjectOption[] {
  if (active.some((area) => area.id === current.id)) {
    return active;
  }
  return [current, ...active];
}

function mergeUsers(active: ProjectUserOption[], extras: ProjectUserOption[]): ProjectUserOption[] {
  const map = new Map(active.map((user) => [user.id, user]));
  for (const extra of extras) {
    if (!map.has(extra.id)) {
      map.set(extra.id, extra);
    }
  }
  return [...map.values()];
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const actor = await requireActiveUser();
  const project = await getProject(actor, id, projectRepository);

  if (!project) {
    notFound();
  }

  if (!canEditProject(project.status)) {
    return (
      <ErrorState
        title="Projeto cancelado"
        message="Projetos cancelados não podem ser editados. O registro permanece visível na consulta."
        action={
          <Link href={`/projects/${project.id}`} className="text-label-md font-semibold text-primary underline">
            Voltar ao projeto
          </Link>
        }
      />
    );
  }

  const [areas, users] = await Promise.all([
    listActiveAreas(actor, areaRepository),
    listActiveUsers(actor, catalogUserRepository),
  ]);

  const areaOptions = mergeArea(
    areas.map((area) => ({ id: area.id, name: area.name, isActive: area.isActive })),
    project.responsibleArea,
  );
  const userOptions = mergeUsers(users, project.participants);

  return (
    <ProjectForm
      mode="edit"
      action={updateProjectAction}
      areas={areaOptions}
      users={userOptions}
      cancelHref={`/projects/${project.id}`}
      initial={{
        id: project.id,
        version: project.version,
        name: project.name,
        description: project.description ?? "",
        responsibleAreaId: project.responsibleArea.id,
        externalResponsible: project.externalResponsible ?? "",
        participantIds: project.participants.map((participant) => participant.id),
        architectureRole: project.architectureRole,
        nature: project.nature,
        startDate: project.startDate ?? "",
        expectedEndDate: project.expectedEndDate ?? "",
        status: project.status,
      }}
    />
  );
}
