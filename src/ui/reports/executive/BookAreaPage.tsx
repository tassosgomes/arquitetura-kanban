import Link from "next/link";
import { ActivityStatusBadge } from "@/ui/activities/ActivityStatusBadge";
import { formatCivilDatePtBr } from "@/application/reports/period-view";
import type { ExecutiveBookArea } from "@/application/reports/executive-book";
import { ActivityType } from "@/domain/activity/enums";
import { AreaIndicators } from "@/ui/reports/executive/AreaIndicators";
import { AreaSummary } from "@/ui/reports/executive/AreaSummary";
import { BookLegend } from "@/ui/reports/executive/BookLegend";
import { DeadlineBadge } from "@/ui/reports/executive/DeadlineBadge";

function cell(value: string): string {
  return value === "" ? "—" : value;
}

function dateCell(value: string): string {
  return value === "" ? "—" : formatCivilDatePtBr(value);
}

function descriptionCell(value: string | null): string {
  if (!value) {
    return "Sem descrição";
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 150 ? `${normalized.slice(0, 147)}…` : normalized;
}

export function BookAreaPage({
  area,
  pageNumber,
  totalPages,
}: {
  area: ExecutiveBookArea;
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <article className="book-area-page flex flex-col gap-space-md" aria-labelledby={`book-area-${pageNumber}`}>
      <header className="flex flex-col gap-1 border-b border-outline-variant/50 pb-space-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-sm font-semibold uppercase tracking-wider text-outline">
            Página {pageNumber} de {totalPages}
          </p>
          <h2 id={`book-area-${pageNumber}`} className="text-headline-lg text-on-surface">
            {area.name}
          </h2>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {area.activities.length} {area.activities.length === 1 ? "atividade" : "atividades"}
        </p>
      </header>

      {area.deliveries.length > 0 ? (
        <section className="rounded-xl bg-primary-container/10 p-space-md" aria-labelledby={`book-deliveries-${pageNumber}`}>
          <h3 id={`book-deliveries-${pageNumber}`} className="text-headline-sm text-on-surface">
            Destaques da área
          </h3>
          <ul className="mt-2 flex flex-col gap-1 text-body-sm">
            {area.deliveries.map((delivery) => (
              <li key={delivery.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/projects/${delivery.projectId}/value-deliveries/${delivery.id}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {delivery.title}
                </Link>
                <span className="font-mono text-code-sm text-on-surface-variant">
                  {formatCivilDatePtBr(delivery.referenceDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm" aria-labelledby={`book-activities-${pageNumber}`}>
        <h3 id={`book-activities-${pageNumber}`} className="sr-only">
          Atividades da área
        </h3>
        <table className="min-w-full text-left text-body-sm">
          <caption className="sr-only">Atividades solicitadas por {area.name}</caption>
          <thead className="bg-surface-container-low text-on-surface-variant">
            <tr>
              <th scope="col" className="px-3 py-3 text-label-sm font-semibold uppercase tracking-wider">Projeto</th>
              <th scope="col" className="min-w-56 px-3 py-3 text-label-sm font-semibold uppercase tracking-wider">Atividade / descrição</th>
              <th scope="col" className="px-3 py-3 text-label-sm font-semibold uppercase tracking-wider">Prioridade</th>
              <th scope="col" className="px-3 py-3 text-label-sm font-semibold uppercase tracking-wider">Status</th>
              <th scope="col" className="px-3 py-3 text-label-sm font-semibold uppercase tracking-wider">Status prazo</th>
              <th scope="col" className="px-3 py-3 text-label-sm font-semibold uppercase tracking-wider">Checklist</th>
              <th scope="col" className="px-3 py-3 text-label-sm font-semibold uppercase tracking-wider">Previsão</th>
              <th scope="col" className="px-3 py-3 text-label-sm font-semibold uppercase tracking-wider">Responsável</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {area.activities.map((activity) => (
              <tr key={activity.id} className="align-top transition-colors hover:bg-primary-container/5">
                <td className="px-3 py-3 text-on-surface-variant">
                  {activity.projectId ? (
                    <Link href={`/projects/${activity.projectId}`} className="font-semibold text-primary hover:underline">
                      {cell(activity.project)}
                    </Link>
                  ) : activity.typeKey === ActivityType.AD_HOC ? (
                    "Ad hoc"
                  ) : (
                    cell(activity.project)
                  )}
                </td>
                <td className="px-3 py-3">
                  <Link href={`/activities/${activity.id}`} className="font-semibold text-on-surface hover:text-primary hover:underline">
                    {activity.title}
                  </Link>
                  <p className="mt-1 max-w-md text-body-sm text-on-surface-variant">{descriptionCell(activity.description)}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-on-surface-variant">{cell(activity.priority)}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  {activity.statusKey ? <ActivityStatusBadge status={activity.statusKey} /> : <span className="text-outline">—</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <DeadlineBadge status={activity.deadlineStatus} label={activity.deadlineStatusLabel} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-code-sm text-on-surface-variant">
                  {activity.checklistTotalCount > 0
                    ? `${activity.checklistDoneCount}/${activity.checklistTotalCount}`
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-code-sm text-on-surface-variant">{dateCell(activity.forecastDate)}</td>
                <td className="px-3 py-3 text-on-surface-variant">{cell(activity.owner)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-space-md lg:grid-cols-3">
        <AreaSummary area={area} headingId={`book-resumo-area-${pageNumber}`} />
        <BookLegend summary={area.deadlineSummary} headingId={`book-legenda-${pageNumber}`} />
        <AreaIndicators area={area} headingId={`book-indicadores-area-${pageNumber}`} />
      </div>
    </article>
  );
}
