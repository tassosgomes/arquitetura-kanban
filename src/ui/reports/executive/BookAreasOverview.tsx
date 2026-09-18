import Link from "next/link";
import type { ReactElement } from "react";
import { ActivityStatus } from "@/domain/activity/enums";
import type {
  ExecutiveBookAreaOverview,
  ExecutiveBookConsolidated,
  ExecutiveBookStatusSummary,
} from "@/application/reports/executive-book";

export type BookAreasOverviewProps = {
  areas: readonly ExecutiveBookAreaOverview[];
  totals: ExecutiveBookConsolidated;
  areaHref: (areaId: string | null) => string;
};

function statusCount(summary: readonly ExecutiveBookStatusSummary[], status: ActivityStatus): number {
  return summary.find((item) => item.status === status)?.count ?? 0;
}

function OnTimeCell({
  onTime,
  eligible,
  percentage,
}: {
  onTime: number;
  eligible: number;
  percentage: number | null;
}): ReactElement {
  if (percentage === null) {
    return (
      <span className="flex flex-col gap-0.5">
        <span className="text-on-surface-variant">—</span>
        <span className="text-label-sm text-outline">sem elegíveis</span>
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={`${percentage}% no prazo (${onTime} de ${eligible} atividades elegíveis)`}
      className="inline-flex items-center gap-2"
    >
      <span
        className="relative h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-container-high"
        aria-hidden="true"
      >
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </span>
      <span className="font-mono text-code-sm text-on-surface-variant" aria-hidden="true">
        {percentage}%
      </span>
    </span>
  );
}

function RiskCell({ overdue }: { overdue: number }): ReactElement {
  if (overdue === 0) {
    return <span className="text-outline">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-error">
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        warning
      </span>
      {overdue} {overdue === 1 ? "atrasada" : "atrasadas"}
    </span>
  );
}

const HEADER_CLASS = "px-3 py-3 text-label-sm font-semibold uppercase tracking-wider";

export function BookAreasOverview({ areas, totals, areaHref }: BookAreasOverviewProps): ReactElement {
  const totalInProgress = statusCount(totals.statusSummary, ActivityStatus.IN_PROGRESS);

  return (
    <section
      className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm"
      aria-labelledby="book-areas-overview-heading"
    >
      <h3 id="book-areas-overview-heading" className="px-space-md pt-space-md text-headline-sm text-on-surface">
        Áreas em um olhar
      </h3>
      <table className="mt-2 min-w-full text-left text-body-sm">
        <caption className="sr-only">Indicadores consolidados por área solicitante</caption>
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th scope="col" className={HEADER_CLASS}>
              Área
            </th>
            <th scope="col" className={HEADER_CLASS}>
              Ativ.
            </th>
            <th scope="col" className={HEADER_CLASS}>
              Proj.
            </th>
            <th scope="col" className={HEADER_CLASS}>
              Em andamento
            </th>
            <th scope="col" className={HEADER_CLASS}>
              Concluídas
            </th>
            <th scope="col" className={HEADER_CLASS}>
              No prazo
            </th>
            <th scope="col" className={HEADER_CLASS}>
              Risco
            </th>
            <th scope="col" className={HEADER_CLASS}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {areas.map((area) => (
            <tr key={area.id ?? "sem-area"} className="align-top transition-colors hover:bg-primary-container/5">
              <td className="px-3 py-3 font-medium text-on-surface">{area.name}</td>
              <td className="px-3 py-3 font-mono text-code-sm text-on-surface-variant">{area.activityCount}</td>
              <td className="px-3 py-3 font-mono text-code-sm text-on-surface-variant">{area.totalProjects}</td>
              <td className="px-3 py-3 font-mono text-code-sm text-on-surface-variant">{area.inProgress}</td>
              <td className="px-3 py-3 font-mono text-code-sm text-on-surface-variant">{area.done}</td>
              <td className="px-3 py-3">
                <OnTimeCell onTime={area.onTime} eligible={area.eligible} percentage={area.onTimePercentage} />
              </td>
              <td className="px-3 py-3">
                <RiskCell overdue={area.overdue} />
              </td>
              <td className="px-3 py-3">
                <Link href={areaHref(area.id)} className="font-semibold text-primary hover:underline">
                  ver<span className="sr-only"> detalhes de {area.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-outline-variant/60 bg-surface-container-low font-semibold text-on-surface">
            <td className="px-3 py-3">Total</td>
            <td className="px-3 py-3 font-mono text-code-sm">{totals.totalActivities}</td>
            <td className="px-3 py-3 font-mono text-code-sm">{totals.totalProjects}</td>
            <td className="px-3 py-3 font-mono text-code-sm">{totalInProgress}</td>
            <td className="px-3 py-3 font-mono text-code-sm">{totals.done}</td>
            <td className="px-3 py-3">
              <OnTimeCell onTime={totals.onTime} eligible={totals.eligible} percentage={totals.onTimePercentage} />
            </td>
            <td className="px-3 py-3">
              <RiskCell overdue={totals.overdue} />
            </td>
            <td className="px-3 py-3" />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
