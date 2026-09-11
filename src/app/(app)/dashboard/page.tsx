import Link from "next/link";
import { listAreas, listDomains, listUsers } from "@/application/catalogs";
import { listProjects } from "@/application/projects";
import { ProjectStatus } from "@/domain/project/project-status";
import {
  computeManagementSnapshot,
  describeManagementPeriod,
  hasActiveManagementFilters,
  parseManagementSearchParams,
} from "@/application/reports";
import { resolveTemporalQuery } from "@/application/temporal";
import {
  activityRepository,
  areaRepository,
  auditRepository,
  catalogUserRepository,
  domainRepository,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { systemClock } from "@/application/ports/clock";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ErrorState } from "@/ui/feedback/ErrorState";
import { InfoTooltip } from "@/ui/feedback/InfoTooltip";
import { DashboardFilters } from "@/ui/dashboard/DashboardFilters";
import { DashboardPeriodBanner } from "@/ui/dashboard/DashboardPeriodBanner";
import { DistributionBars } from "@/ui/dashboard/DistributionBars";
import { IndicatorCards } from "@/ui/dashboard/IndicatorCards";
import { formatUserLabel } from "@/ui/projects/project-types";

type DashboardPageProps = {
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
  return query ? `/dashboard?${query}` : "/dashboard";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const actor = await requireActiveUser();
  const rawParams = await searchParams;
  const parsed = parseManagementSearchParams(rawParams);
  const now = systemClock.now();
  const clock = { now: () => now };

  let areas;
  let domains;
  let users;
  let projects;
  let snapshot;

  try {
    const catalogPromise = Promise.all([
      listAreas(actor, "all", areaRepository),
      listDomains(actor, "all", domainRepository),
      listUsers(actor, catalogUserRepository),
      listProjects(actor, "all", projectRepository),
    ]);

    if (parsed.error) {
      [areas, domains, users, projects] = await catalogPromise;
      snapshot = null;
    } else {
      const [catalogs, computed] = await Promise.all([
        catalogPromise,
        computeManagementSnapshot(actor, parsed.query, {
          activities: activityRepository,
          audit: auditRepository,
          users: catalogUserRepository,
          areas: areaRepository,
          domains: domainRepository,
          projects: projectRepository,
          clock,
        }),
      ]);
      [areas, domains, users, projects] = catalogs;
      snapshot = computed;
    }
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar o dashboard"
        message="Tente novamente em instantes. Os indicadores não foram perdidos."
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

  const filtersActive = hasActiveManagementFilters(parsed.values);
  const resolved = parsed.error ? null : resolveTemporalQuery(parsed.query.temporal, now);
  const periodView =
    resolved === null
      ? null
      : describeManagementPeriod({ period: parsed.values.period, resolved });
  const empty = snapshot !== null && snapshot.indicators["I-01"] === 0;

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex items-center gap-1.5">
        <h1 className="text-headline-lg text-on-surface">Dashboard</h1>
        <InfoTooltip label="Como o Dashboard funciona">
          <p>
            Quanto estamos fazendo, onde estamos atuando e em que situação estava o trabalho no
            encerramento do recorte. Totais vêm das agregações gerenciais; o Kanban continua
            mostrando o estado atual.
          </p>
          <p className="mt-2">
            Filtros de área, responsável, projeto e demais dimensões usam o retrato no
            encerramento, não o estado atual do Kanban. Canceladas entram no total quando
            pertencem ao recorte.
          </p>
        </InfoTooltip>
      </header>

      <DashboardFilters
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
          label: domain.isActive ? domain.name : `${domain.name} (inativo)`,
        }))}
      />

      {parsed.error ? (
        <p
          className="rounded-xl border border-secondary-container/40 bg-secondary-container/10 px-3 py-2 text-body-sm text-on-surface"
          role="alert"
        >
          {parsed.error} Os indicadores não foram calculados.
        </p>
      ) : null}

      {periodView ? <DashboardPeriodBanner view={periodView} /> : null}

      {snapshot ? (
        <>
          <IndicatorCards indicators={snapshot.indicators} />
          {empty ? (
            <EmptyState
              title="Nenhuma atividade no recorte"
              message={
                filtersActive
                  ? "Nenhuma atividade corresponde aos filtros e ao período selecionados."
                  : "Não há atividades com intervalo de execução neste período."
              }
              action={
                filtersActive ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Limpar filtros
                  </Link>
                ) : (
                  <Link
                    href="/kanban"
                    className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Ir ao Kanban
                  </Link>
                )
              }
            />
          ) : null}
          <DistributionBars distributions={snapshot.distributions} />
        </>
      ) : null}
    </div>
  );
}
