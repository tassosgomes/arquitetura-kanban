import Link from "next/link";
import { listActiveAreas, listActiveDomains, listActiveUsers } from "@/application/catalogs";
import { listProjectPrefills } from "@/application/activities";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import {
  areaRepository,
  catalogUserRepository,
  domainRepository,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { createActivityAction } from "@/app/actions/activities";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ActivityForm } from "@/ui/activities/ActivityForm";
import type { ActivityFormValues, ActivityProjectOption } from "@/ui/activities/activity-types";

type NewActivityPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

function snapshotToOption(snapshot: {
  id: string;
  name: string;
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
      participantIds: snapshot.participantIds,
      nature: snapshot.nature,
      architectureRole: snapshot.architectureRole,
      requestingAreaId: snapshot.responsibleAreaId,
    },
  };
}

export default async function NewActivityPage({ searchParams }: NewActivityPageProps) {
  const { projectId: projectIdParam } = await searchParams;
  const actor = await requireActiveUser();
  const [areas, domains, users, prefills] = await Promise.all([
    listActiveAreas(actor, areaRepository),
    listActiveDomains(actor, domainRepository),
    listActiveUsers(actor, catalogUserRepository),
    listProjectPrefills(actor, projectRepository),
  ]);

  if (areas.length === 0) {
    return (
      <EmptyState
        title="Cadastre uma área primeiro"
        message="É necessário ao menos uma área ativa para criar uma atividade."
        action={
          <Link href="/catalogs/areas" className="text-label-md font-semibold text-primary underline">
            Ir para áreas
          </Link>
        }
      />
    );
  }

  if (domains.length === 0) {
    return (
      <EmptyState
        title="Cadastre um domínio primeiro"
        message="É necessário ao menos um domínio ativo para classificar a atividade."
        action={
          <Link href="/catalogs/domains" className="text-label-md font-semibold text-primary underline">
            Ir para domínios
          </Link>
        }
      />
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="Nenhum usuário ativo"
        message="É necessário um usuário ativo para definir o responsável."
      />
    );
  }

  const projects = prefills.map(snapshotToOption);
  const requestedProject = projectIdParam
    ? projects.find((project) => project.id === projectIdParam)
    : undefined;
  const defaults = requestedProject?.defaults ?? null;
  const initialProjectId = requestedProject?.id ?? "";

  const initial: ActivityFormValues = {
    title: "",
    description: "",
    observations: "",
    type: initialProjectId ? ActivityType.PROJECT : ActivityType.AD_HOC,
    projectId: initialProjectId,
    requestingAreaId: defaults?.requestingAreaId ?? "",
    domainId: "",
    nature: defaults?.nature ?? "",
    architectureRole: defaults?.architectureRole ?? "",
    ownerId: initialProjectId ? actor.id : "",
    participantIds: defaults?.participantIds ?? [],
    involvedAreaIds: [],
    priority: Priority.MEDIUM,
    effort: "",
    status: ActivityStatus.BACKLOG,
    startDate: "",
    expectedEndDate: "",
    completedDate: "",
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-code-sm">
          <Link href="/kanban" className="font-semibold text-primary hover:underline">
            Kanban
          </Link>
        </p>
        <h1 className="text-headline-lg text-on-surface">Nova atividade</h1>
        <p className="max-w-2xl text-body-md leading-6 text-on-surface-variant">
          Cadastre uma demanda ad hoc ou vinculada a um projeto. Valores herdados do projeto podem
          ser alterados e não são sincronizados depois de salvar.
        </p>
      </header>
      <ActivityForm
        mode="create"
        action={createActivityAction}
        areas={areas.map((area) => ({ id: area.id, name: area.name, isActive: area.isActive }))}
        domains={domains.map((domain) => ({
          id: domain.id,
          name: domain.name,
          isActive: domain.isActive,
        }))}
        users={users}
        projects={projects}
        cancelHref={initialProjectId ? `/projects/${initialProjectId}/activities` : "/kanban"}
        defaultOwnerId={actor.id}
        initial={initial}
      />
    </div>
  );
}
