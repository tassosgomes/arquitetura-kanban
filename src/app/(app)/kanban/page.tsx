import Link from "next/link";
import {
  hasActiveKanbanFilters,
  EFFORT_FILTER_UNSET,
  KANBAN_PERIOD_OPTIONS,
  KanbanPeriodOption,
  listActivities,
  parseKanbanSearchParams,
  shouldShowCancelledList,
  splitKanbanActivities,
  toActivityListFilter,
} from "@/application/activities";
import { listAreas, listDomains, listUsers } from "@/application/catalogs";
import { listProjects } from "@/application/projects";
import { ActivityStatus } from "@/domain/activity/enums";
import { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";
import { ProjectStatus } from "@/domain/project/project-status";
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

type InvalidKanbanFilterParam = {
  label: string;
  value: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERIOD_VALUES = new Set<string>(KANBAN_PERIOD_OPTIONS);
const NATURE_VALUES = new Set<string>(Object.values(Nature));
const PRIORITY_VALUES = new Set<string>(Object.values(Priority));
const ROLE_VALUES = new Set<string>(Object.values(ArchitectureRole));
const EFFORT_VALUES = new Set<string>([...Object.values(Effort), EFFORT_FILTER_UNSET]);
const STATUS_VALUES = new Set<string>(Object.values(ActivityStatus));
const BOOLEAN_VALUES = new Set(["0", "1", "false", "true", "off", "on"]);

function paramValues(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const value = searchParams[key];
  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues
    .filter((raw): raw is string => typeof raw === "string")
    .map((raw) => raw.trim())
    .filter((raw) => raw !== "");
}

function invalidKanbanFilterParams(
  searchParams: Record<string, string | string[] | undefined>,
): InvalidKanbanFilterParam[] {
  const invalid: InvalidKanbanFilterParam[] = [];

  function check(key: string, label: string, isValid: (value: string) => boolean) {
    for (const value of paramValues(searchParams, key)) {
      if (!isValid(value)) {
        invalid.push({ label, value });
      }
    }
  }

  check("period", "Período", (value) => PERIOD_VALUES.has(value));
  check("area", "Área", (value) => UUID_PATTERN.test(value));
  check("project", "Projeto", (value) => UUID_PATTERN.test(value));
  check("owner", "Responsável", (value) => UUID_PATTERN.test(value));
  check("participant", "Participante", (value) => UUID_PATTERN.test(value));
  check("domain", "Categoria", (value) => UUID_PATTERN.test(value));
  check("nature", "Natureza", (value) => NATURE_VALUES.has(value));
  check("priority", "Prioridade", (value) => PRIORITY_VALUES.has(value));
  check("role", "Papel da arquitetura", (value) => ROLE_VALUES.has(value));
  check("effort", "Esforço", (value) => EFFORT_VALUES.has(value));
  check("status", "Status", (value) => STATUS_VALUES.has(value));
  check("includeCancelled", "Incluir cancelados", (value) => BOOLEAN_VALUES.has(value));
  check("mine", "Somente minhas", (value) => BOOLEAN_VALUES.has(value));

  const period = paramValues(searchParams, "period")[0];
  if (period !== KanbanPeriodOption.CUSTOM) {
    for (const key of ["from", "to"]) {
      for (const value of paramValues(searchParams, key)) {
        invalid.push({ label: "Período personalizado", value });
      }
    }
  }

  return invalid;
}

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
  const invalidFilterParams = invalidKanbanFilterParams(rawParams);
  const listFilter = toActivityListFilter(parsed.values, actor.id, {
    skipTemporal: Boolean(parsed.error),
  });

  let activities;
  let allActivities;
  let areas;
  let domains;
  let users;
  let projects;
  try {
    [activities, allActivities, areas, domains, users, projects] = await Promise.all([
      listActivities(actor, listFilter, activityRepository),
      listActivities(actor, { includeCancelled: true }, activityRepository),
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
  const denominator = allActivities.length;
  const filtersActive = hasActiveKanbanFilters(parsed.values);
  const emptyMessage = filtersActive
    ? "Nenhuma atividade corresponde aos filtros."
    : "Nenhuma atividade no recorte. Cadastre uma atividade para começar.";
  const hasFilterWarning = Boolean(parsed.error || invalidFilterParams.length > 0);
  const invalidFilterDescription = invalidFilterParams
    .map((filter) => `${filter.label} (${filter.value})`)
    .join(", ");

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
        hasFilterWarning={hasFilterWarning}
        periodError={Boolean(parsed.error)}
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

      {hasFilterWarning ? (
        <div
          className="flex flex-col gap-1 rounded-xl border border-error/40 bg-error-container/30 px-3 py-2 text-body-sm text-on-surface"
          role="alert"
        >
          {invalidFilterParams.length > 0 ? (
            <p>
              Filtros não aplicados: {invalidFilterDescription}. Os valores informados na URL são
              inválidos.
            </p>
          ) : null}
          {parsed.error ? <p>{parsed.error} O recorte temporal não foi aplicado.</p> : null}
        </div>
      ) : null}

      <p className="text-body-sm text-on-surface-variant" role="status" aria-live="polite">
        {`${total} de ${denominator} ${denominator === 1 ? "atividade" : "atividades"} no recorte`}
        {total > 0
          ? ` · ${board.length} no board${
              showCancelled ? ` · ${cancelled.length} cancelada${cancelled.length === 1 ? "" : "s"}` : ""
            }.`
          : `. ${emptyMessage}`}
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
