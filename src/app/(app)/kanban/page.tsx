import Link from "next/link";
import {
  hasActiveKanbanFilters,
  listActivities,
  parseKanbanSearchParams,
  shouldShowCancelledList,
  splitKanbanActivities,
  toActivityListFilter,
} from "@/application/activities";
import { listAreas, listDomains, listUsers } from "@/application/catalogs";
import { listProjects } from "@/application/projects";
import { ProjectStatus } from "@/domain/project/project-status";
import { ActivityStatus } from "@/domain/activity/enums";
import {
  activityRepository,
  areaRepository,
  catalogUserRepository,
  domainRepository,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ErrorState } from "@/ui/feedback/ErrorState";
import { InfoTooltip } from "@/ui/feedback/InfoTooltip";
import { KanbanBoard } from "@/ui/kanban/KanbanBoard";
import { KanbanCardBody } from "@/ui/kanban/KanbanCard";
import { KanbanFilters } from "@/ui/kanban/KanbanFilters";
import { formatUserLabel } from "@/ui/projects/project-types";

type KanbanPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function retryHref(searchParams: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw) {
      params.set(key, raw);
    }
  }
  const query = params.toString();
  return query ? `/kanban?${query}` : "/kanban";
}

export default async function KanbanPage({ searchParams }: KanbanPageProps) {
  const actor = await requireActiveUser();
  const rawParams = await searchParams;
  const parsed = parseKanbanSearchParams(rawParams);
  const listFilter = toActivityListFilter(parsed.values, actor.id, {
    skipTemporal: Boolean(parsed.error),
  });

  let activities;
  let areas;
  let domains;
  let users;
  let projects;
  try {
    [activities, areas, domains, users, projects] = await Promise.all([
      listActivities(actor, listFilter, activityRepository),
      listAreas(actor, "all", areaRepository),
      listDomains(actor, "all", domainRepository),
      listUsers(actor, catalogUserRepository),
      listProjects(actor, "all", projectRepository),
    ]);
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar o Kanban"
        message="Tente novamente em instantes. As atividades não foram perdidas."
        action={
          <Link
            href={retryHref(rawParams)}
            className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Tentar de novo
          </Link>
        }
      />
    );
  }

  const { board, cancelled } = splitKanbanActivities(activities);
  const showCancelled = shouldShowCancelledList(parsed.values);
  const total = activities.length;
  const filtersActive = hasActiveKanbanFilters(parsed.values);
  const emptyMessage = filtersActive
    ? "Nenhuma atividade corresponde aos filtros."
    : "Nenhuma atividade no recorte. Cadastre uma atividade para começar.";

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-1.5">
          <h1 className="text-headline-lg text-on-surface">Kanban</h1>
          <InfoTooltip label="Como o Kanban funciona">
            <p>
              Board único da equipe. Filtros combinam sobre o mesmo conjunto de cards. A coluna
              é o status atual, mesmo com recorte de período. Clique no card para abrir o
              detalhe.
            </p>
            <p className="mt-2">
              Arraste pela alça para outra coluna, use Espaço e setas na alça, ou o seletor
              “Mover para”. Cancelar permanece no detalhe da atividade.
            </p>
            <p className="mt-2">
              Canceladas não ocupam coluna: use “Incluir cancelados” ou o status Cancelado para
              vê-las na lista abaixo do board. Responsável e participante são filtros distintos.
              O período não altera a coluna atual da atividade.
            </p>
          </InfoTooltip>
        </div>
        <Link
          href="/activities/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary-container px-space-md py-2.5 text-label-md font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            add_circle
          </span>
          Nova atividade
        </Link>
      </header>

      <KanbanFilters
        key={JSON.stringify(parsed.values)}
        values={parsed.values}
        areas={areas.map((area) => ({
          id: area.id,
          label: area.isActive ? area.name : `${area.name} (inativa)`,
        }))}
        projects={projects.map((project) => ({
          id: project.id,
          label:
            project.status === ProjectStatus.CANCELLED
              ? `${project.name} (cancelado)`
              : project.name,
        }))}
        users={users.map((user) => ({
          id: user.id,
          label: `${formatUserLabel(user)}${user.isActive ? "" : " (inativo)"}`,
        }))}
        domains={domains.map((domain) => ({
          id: domain.id,
          label: domain.isActive ? domain.name : `${domain.name} (inativa)`,
        }))}
      />

      {parsed.error ? (
        <p
          className="rounded-xl border border-secondary-container/40 bg-secondary-container/10 px-3 py-2 text-body-sm text-on-surface"
          role="alert"
        >
          {parsed.error} O recorte temporal não foi aplicado.
        </p>
      ) : null}

      <p className="text-body-sm text-on-surface-variant">
        {total === 0
          ? emptyMessage
          : `${total} ${total === 1 ? "atividade" : "atividades"} no recorte · ${board.length} no board${
              showCancelled ? ` · ${cancelled.length} cancelada${cancelled.length === 1 ? "" : "s"}` : ""
            }.`}
      </p>

      {total === 0 && filtersActive ? (
        <EmptyState
          title="Nenhuma atividade encontrada"
          message="Ajuste ou limpe os filtros para ver o trabalho da equipe."
          action={
            <Link
              href="/kanban"
              className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Limpar filtros
            </Link>
          }
        />
      ) : null}

      {parsed.values.status === ActivityStatus.CANCELLED || (total === 0 && filtersActive) ? null : (
        <KanbanBoard activities={board} />
      )}

      {showCancelled ? (
        <section className="flex flex-col gap-3" aria-labelledby="kanban-canceladas">
          <div className="flex flex-col gap-1">
            <h2 id="kanban-canceladas" className="text-headline-md text-on-surface">
              Canceladas
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Cancelado não é coluna do board. Abra o card para ver o detalhe.
            </p>
          </div>
          {cancelled.length === 0 ? (
            <p className="rounded-xl border border-dashed border-outline-variant px-3 py-6 text-center text-body-sm text-on-surface-variant">
              Nenhuma atividade cancelada neste recorte.
            </p>
          ) : (
            <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
              {cancelled.map((activity) => (
                <li key={activity.id}>
                  <Link
                    href={`/activities/${activity.id}`}
                    className="group flex flex-col gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-space-md opacity-90 shadow-sm transition-all hover:opacity-100 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <KanbanCardBody activity={activity} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
