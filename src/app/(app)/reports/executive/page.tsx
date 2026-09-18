import Link from "next/link";
import { listActiveAreas, listActiveDomains, listActiveUsers } from "@/application/catalogs";
import { listProjects } from "@/application/projects";
import {
  buildExecutiveBook,
  hasActiveManagementFilters,
  managementHref,
  parseManagementSearchParams,
} from "@/application/reports";
import { systemClock } from "@/application/ports/clock";
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
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ErrorState } from "@/ui/feedback/ErrorState";
import { InfoTooltip } from "@/ui/feedback/InfoTooltip";
import { DashboardFilters } from "@/ui/dashboard/DashboardFilters";
import { BookAreaPage } from "@/ui/reports/executive/BookAreaPage";
import { BookAreaNav } from "@/ui/reports/executive/BookAreaNav";
import { BookConsolidated } from "@/ui/reports/executive/BookConsolidated";
import { BookIconLegend } from "@/ui/reports/executive/BookIconLegend";
import { BookPrintButton } from "@/ui/reports/executive/BookPrintButton";
import { formatCivilDatePtBr } from "@/application/reports/period-view";
import { formatUserLabel } from "@/ui/projects/project-types";

type ExecutiveBookPageProps = {
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
  return query ? `/reports/executive?${query}` : "/reports/executive";
}

export default async function ExecutiveBookPage({ searchParams }: ExecutiveBookPageProps) {
  const actor = await requireActiveUser();
  const rawParams = await searchParams;
  const parsed = parseManagementSearchParams(rawParams);
  const now = systemClock.now();
  const clock = { now: () => now };

  let areas;
  let domains;
  let users;
  let projects;
  let book;

  try {
    const catalogPromise = Promise.all([
      listActiveAreas(actor, areaRepository),
      listActiveDomains(actor, domainRepository),
      listActiveUsers(actor, catalogUserRepository),
      listProjects(actor, "active", projectRepository),
    ]);

    if (parsed.error) {
      [areas, domains, users, projects] = await catalogPromise;
      book = null;
    } else {
      const [catalogs, computed] = await Promise.all([
        catalogPromise,
        buildExecutiveBook(actor, parsed.query, {
          activities: activityRepository,
          audit: auditRepository,
          users: catalogUserRepository,
          areas: areaRepository,
          domains: domainRepository,
          projects: projectRepository,
          valueDeliveries: valueDeliveryRepository,
          clock,
        }),
      ]);
      [areas, domains, users, projects] = catalogs;
      book = computed;
    }
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar o Book"
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

  const filtersActive = hasActiveManagementFilters(parsed.values);
  const areaHref = (areaId: string | null): string =>
    managementHref("/reports/executive", { ...parsed.values, requestingAreaId: areaId ?? undefined }, 1);
  const allAreasHref = areaHref(null);
  const selectedAreaId = parsed.values.requestingAreaId ?? null;
  // Counts only make sense while every area is in the slice. Once one is
  // selected the Book holds that area alone, so every other chip would read
  // zero and lie about it — we drop the counts instead.
  const activityCountByArea =
    selectedAreaId === null
      ? new Map((book?.areas ?? []).map((area) => [area.id, area.activities.length]))
      : null;

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-1.5">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-headline-lg text-on-surface">Book executivo</h1>
              <InfoTooltip label="Como o Book funciona">
                <p>
                  Uma página por área solicitante com as atividades do recorte. O Book usa o retrato
                  histórico no fechamento do período para dimensões e indicadores.
                </p>
                <p className="mt-2">
                  Títulos, descrições e checklist refletem o registro atual. A soma das páginas é
                  igual ao total de atividades do recorte.
                </p>
              </InfoTooltip>
            </div>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Data base: {book ? formatCivilDatePtBr(book.dataBase) : "—"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-space-sm">
          <BookPrintButton />
          <Link
            href="/reports"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-container-lowest px-space-md py-2.5 text-label-md font-semibold text-primary shadow-sm hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
          >
            Relatório detalhado
          </Link>
        </div>
      </header>

      <DashboardFilters
        key={JSON.stringify(parsed.values)}
        basePath="/reports/executive"
        areaFilterMode="hidden"
        values={parsed.values}
        areas={areas.map((area) => ({
          id: area.id,
          label: area.name,
        }))}
        projects={projects.map((project) => ({
          id: project.id,
          label: project.name,
        }))}
        users={users.map((user) => ({
          id: user.id,
          label: formatUserLabel(user),
        }))}
        domains={domains.map((domain) => ({
          id: domain.id,
          label: domain.name,
        }))}
      />

      {parsed.error ? (
        <p
          className="rounded-xl border border-secondary-container/40 bg-secondary-container/10 px-3 py-2 text-body-sm text-on-surface"
          role="alert"
        >
          {parsed.error} O Book não foi gerado.
        </p>
      ) : null}

      {book ? (
        <div className="flex flex-col gap-space-lg">
          <BookAreaNav
            selectedAreaId={selectedAreaId}
            allAreasHref={allAreasHref}
            totalCount={activityCountByArea ? book.consolidated.totalActivities : undefined}
            areas={areas.map((area) => ({
              id: area.id,
              label: area.name,
              href: areaHref(area.id),
              count: activityCountByArea?.get(area.id) ?? undefined,
            }))}
          />

          <main className="flex min-w-0 flex-col gap-space-lg">
            {book.areas.length === 0 ? (
              <EmptyState
                title="Nenhuma atividade para o Book"
                message={
                  filtersActive
                    ? "Ajuste os filtros ou selecione outra área solicitante para gerar as páginas."
                    : "Não há atividades com intervalo de execução neste período."
                }
                action={
                  filtersActive ? (
                    <Link
                      href={allAreasHref}
                      className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Limpar área selecionada
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
            ) : (
              <>
                {selectedAreaId === null ? (
                  <BookConsolidated
                    consolidated={book.consolidated}
                    dataBase={book.dataBase}
                    areaHref={areaHref}
                  />
                ) : null}

                {book.areas.map((area, index) => (
                  <BookAreaPage
                    key={area.id ?? "missing-area"}
                    area={area}
                    pageNumber={index + 1}
                    totalPages={book.areas.length}
                  />
                ))}

                <BookIconLegend />
              </>
            )}
          </main>
        </div>
      ) : null}
    </div>
  );
}
