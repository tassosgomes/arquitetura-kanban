import Link from "next/link";
import { notFound } from "next/navigation";
import { listActiveAreas, listActiveDomains, listActiveUsers } from "@/application/catalogs";
import { getActivity, listProjectPrefills } from "@/application/activities";
import { canEditActivity } from "@/domain/activity/enums";
import {
  activityRepository,
  areaRepository,
  catalogUserRepository,
  domainRepository,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { updateActivityAction } from "@/app/actions/activities";
import { ErrorState } from "@/ui/feedback/ErrorState";
import { ActivityForm } from "@/ui/activities/ActivityForm";
import type {
  ActivityProjectOption,
  ActivityUserOption,
  CatalogOption,
} from "@/ui/activities/activity-types";
import { ArchitectureRole, Nature } from "@/domain/catalog/classifications";

type EditActivityPageProps = {
  params: Promise<{ id: string }>;
};

function mergeOption(active: CatalogOption[], current: CatalogOption): CatalogOption[] {
  if (active.some((item) => item.id === current.id)) {
    return active;
  }
  return [current, ...active];
}

function mergeUsers(active: ActivityUserOption[], extras: ActivityUserOption[]): ActivityUserOption[] {
  const map = new Map(active.map((user) => [user.id, user]));
  for (const extra of extras) {
    if (!map.has(extra.id)) {
      map.set(extra.id, extra);
    }
  }
  return [...map.values()];
}

function snapshotToOption(snapshot: {
  id: string;
  name: string;
  architectureOwnerId: string;
  participantIds: string[];
  nature: Nature;
  architectureRole: ArchitectureRole;
  responsibleAreaId: string;
}): ActivityProjectOption {
  return {
    id: snapshot.id,
    name: snapshot.name,
    defaults: {
      projectId: snapshot.id,
      ownerId: snapshot.architectureOwnerId,
      participantIds: snapshot.participantIds,
      nature: snapshot.nature,
      architectureRole: snapshot.architectureRole,
      requestingAreaId: snapshot.responsibleAreaId,
    },
  };
}

export default async function EditActivityPage({ params }: EditActivityPageProps) {
  const { id } = await params;
  const actor = await requireActiveUser();
  const activity = await getActivity(actor, id, activityRepository);

  if (!activity) {
    notFound();
  }

  if (!canEditActivity(activity.status)) {
    return (
      <ErrorState
        title="Atividade cancelada"
        message="Atividades canceladas não podem ser editadas. O registro permanece visível na consulta."
        action={
          <Link
            href={`/activities/${activity.id}`}
            className="text-sm font-medium text-zinc-900 underline"
          >
            Voltar à atividade
          </Link>
        }
      />
    );
  }

  const [areas, domains, users, prefills] = await Promise.all([
    listActiveAreas(actor, areaRepository),
    listActiveDomains(actor, domainRepository),
    listActiveUsers(actor, catalogUserRepository),
    listProjectPrefills(actor, projectRepository),
  ]);

  const areaOptions = mergeOption(
    areas.map((area) => ({ id: area.id, name: area.name, isActive: area.isActive })),
    activity.requestingArea,
  );
  for (const involved of activity.involvedAreas) {
    if (!areaOptions.some((area) => area.id === involved.id)) {
      areaOptions.push(involved);
    }
  }

  const domainOptions = mergeOption(
    domains.map((domain) => ({ id: domain.id, name: domain.name, isActive: domain.isActive })),
    activity.domain,
  );
  const userOptions = mergeUsers(users, [activity.owner, ...activity.participants]);
  const projectOptions = prefills.map(snapshotToOption);
  if (activity.project && !projectOptions.some((project) => project.id === activity.project?.id)) {
    projectOptions.unshift({
      id: activity.project.id,
      name: `${activity.project.name} (cancelado)`,
      defaults: {
        projectId: activity.project.id,
        ownerId: activity.owner.id,
        participantIds: activity.participants.map((participant) => participant.id),
        nature: activity.nature,
        architectureRole: activity.architectureRole,
        requestingAreaId: activity.requestingArea.id,
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm">
          <Link
            href={`/activities/${activity.id}`}
            className="font-medium text-zinc-700 underline hover:text-zinc-900"
          >
            {activity.title}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Editar atividade</h1>
      </header>
      <ActivityForm
        mode="edit"
        action={updateActivityAction}
        areas={areaOptions}
        domains={domainOptions}
        users={userOptions}
        projects={projectOptions}
        cancelHref={`/activities/${activity.id}`}
        initial={{
          id: activity.id,
          version: activity.version,
          title: activity.title,
          description: activity.description ?? "",
          observations: activity.observations ?? "",
          type: activity.type,
          projectId: activity.project?.id ?? "",
          requestingAreaId: activity.requestingArea.id,
          domainId: activity.domain.id,
          nature: activity.nature,
          architectureRole: activity.architectureRole,
          ownerId: activity.owner.id,
          participantIds: activity.participants.map((participant) => participant.id),
          involvedAreaIds: activity.involvedAreas.map((area) => area.id),
          priority: activity.priority,
          effort: activity.effort ?? "",
          status: activity.status,
          startDate: activity.startDate ?? "",
          expectedEndDate: activity.expectedEndDate ?? "",
          completedDate: activity.completedDate ?? "",
        }}
      />
    </div>
  );
}
