import Link from "next/link";
import { listAreas, listDomains, listUsers } from "@/application/catalogs";
import { listProjects } from "@/application/projects";
import { ProjectStatus } from "@/domain/project/project-status";
import {
  buildManagementReport,
  describeManagementPeriod,
  hasActiveManagementFilters,
  managementHref,
  parseManagementSearchParams,
  reportsCsvHref,
} from "@/application/reports";
import { paginateItems } from "@/application/reports/pagination";
import { resolveTemporalQuery } from "@/application/temporal";
import { systemClock } from "@/application/ports/clock";
import {
  activityRepository,
  areaRepository,
  auditRepository,
  catalogUserRepository,
  domainRepository,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ErrorState } from "@/ui/feedback/ErrorState";
import { DashboardFilters } from "@/ui/dashboard/DashboardFilters";
import { ReportActivityTable, AssociatedProjectsList } from "@/ui/reports/ReportActivityTable";
import { ReportPagination } from "@/ui/reports/ReportPagination";
import { ReportPeriodBanner } from "@/ui/reports/ReportPeriodBanner";
import { ReportSummaryTable } from "@/ui/reports/ReportSummaryTable";
import { formatUserLabel } from "@/ui/projects/project-types";

type ReportsPageProps = {
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
  return query ? `/reports?${query}` : "/reports";
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const actor = await requireActiveUser();
  const rawParams = await searchParams;
  const parsed = parseManagementSearchParams(rawParams);
  const now = systemClock.now();
  const clock = { now: () => now };

  let areas;
  let domains;
  let users;
  let projects;
  let report;

  try {
    const catalogPromise = Promise.all([
      listAreas(actor, "all", areaRepository),
      listDomains(actor, "all", domainRepository),
      listUsers(actor, catalogUserRepository),
      listProjects(actor, "all", projectRepository),
    ]);

    if (parsed.error) {
      [areas, domains, users, projects] = await catalogPromise;
      report = null;
    } else {
      const [catalogs, computed] = await Promise.all([
        catalogPromise,
        buildManagementReport(actor, parsed.query, {
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
      report = computed;
    }
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar o relatório"
        message="Tente novamente em instantes. As atividades não foram perdidas."
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
  const pageSlice = report ? paginateItems(report.activities, parsed.page) : null;
  const csvHref = parsed.error ? null : reportsCsvHref(parsed.query);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Relatórios</h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600">
            O que fizemos no recorte. O resumo usa os mesmos indicadores do dashboard; a lista e o
            CSV usam o retrato no encerramento, não o estado atual do Kanban.
          </p>
        </div>
        {csvHref ? (
          <a
            href={csvHref}
            className="inline-flex shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Exportar CSV
          </a>
        ) : null}
      </header>

      <DashboardFilters
        key={JSON.stringify(parsed.values)}
        basePath="/reports"
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
          {parsed.error} O relatório não foi gerado.
        </p>
      ) : null}

      {periodView ? <ReportPeriodBanner view={periodView} /> : null}

      {report && pageSlice ? (
        <>
          <ReportSummaryTable indicators={report.snapshot.indicators} />
          <AssociatedProjectsList projects={report.associatedProjects} />
          <section className="flex flex-col gap-3" aria-labelledby="relatorio-atividades">
            <div className="flex flex-col gap-1">
              <h2 id="relatorio-atividades" className="text-lg font-semibold text-zinc-900">
                Atividades
              </h2>
              <p className="text-sm text-zinc-600">
                {pageSlice.total === 0
                  ? filtersActive
                    ? "Nenhuma atividade corresponde aos filtros e ao período selecionados."
                    : "Não há atividades com intervalo de execução neste período."
                  : `${pageSlice.total} ${pageSlice.total === 1 ? "atividade" : "atividades"} na seleção. A paginação vale só nesta tela; o CSV exporta todas.`}
              </p>
            </div>
            {pageSlice.total === 0 ? (
              <EmptyState
                title="Nenhuma atividade no recorte"
                message={
                  filtersActive
                    ? "Ajuste ou limpe os filtros para ver o trabalho da equipe."
                    : "Não há atividades com intervalo de execução neste período."
                }
                action={
                  filtersActive ? (
                    <Link
                      href="/reports"
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
            ) : (
              <>
                <ReportActivityTable
                  activities={pageSlice.items}
                  emptyMessage="Não há atividades nesta página da seleção."
                />
                <ReportPagination
                  page={pageSlice.page}
                  totalPages={pageSlice.totalPages}
                  hrefForPage={(page) => managementHref("/reports", parsed.values, page)}
                />
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
