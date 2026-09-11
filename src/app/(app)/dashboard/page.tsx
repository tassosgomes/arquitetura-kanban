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
            className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Quanto estamos fazendo, onde estamos atuando e em que situação estava o trabalho no
          encerramento do recorte. Totais vêm das agregações gerenciais; o Kanban continua mostrando
          o estado atual.
        </p>
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
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
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
                    className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    Limpar filtros
                  </Link>
                ) : (
                  <Link
                    href="/kanban"
                    className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
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
