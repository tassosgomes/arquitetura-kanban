import type { ReactElement } from "react";
import { formatCivilDatePtBr } from "@/application/reports/period-view";
import type { ExecutiveBookConsolidated } from "@/application/reports/executive-book";
import { BookKpiCard } from "@/ui/reports/executive/BookKpiCard";
import { BookAreasOverview } from "@/ui/reports/executive/BookAreasOverview";
import { DeadlineBadge } from "@/ui/reports/executive/DeadlineBadge";

export type BookConsolidatedProps = {
  consolidated: ExecutiveBookConsolidated;
  dataBase: string;
  areaHref: (areaId: string | null) => string;
};

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function StatusDistributionPanel({
  consolidated,
}: {
  consolidated: ExecutiveBookConsolidated;
}): ReactElement {
  const visible = consolidated.statusSummary.filter((item) => item.count > 0);

  return (
    <section
      className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
      aria-labelledby="book-consolidated-status-heading"
    >
      <h3 id="book-consolidated-status-heading" className="text-headline-sm text-on-surface">
        Status (consolidado)
      </h3>
      {visible.length === 0 ? (
        <p className="mt-3 text-body-sm text-on-surface-variant">Sem atividades para distribuir por status.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {visible.map((item) => (
            <li key={item.status} className="flex items-center gap-3 text-body-sm">
              <span className="w-32 shrink-0 truncate text-on-surface-variant">{item.label}</span>
              <span
                className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{ width: `${item.percentage}%` }}
                />
              </span>
              <span className="w-20 shrink-0 text-right font-mono text-code-sm text-on-surface-variant">
                {item.count} ({item.percentage}%)
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeadlineStatusPanel({ consolidated }: { consolidated: ExecutiveBookConsolidated }): ReactElement {
  const summary = consolidated.deadlineSummary;
  const visible = summary.byStatus.filter((item) => item.count > 0);

  return (
    <section
      className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
      aria-labelledby="book-consolidated-deadline-heading"
    >
      <h3 id="book-consolidated-deadline-heading" className="text-headline-sm text-on-surface">
        Status prazo
      </h3>
      {visible.length === 0 ? (
        <p className="mt-3 text-body-sm text-on-surface-variant">Sem atividades com status de prazo apurado.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {visible.map((item) => (
            <li key={item.status} className="flex items-center justify-between gap-2 text-body-sm">
              <DeadlineBadge status={item.status} label={item.label} />
              <span className="font-mono text-code-sm text-on-surface-variant">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-body-sm text-on-surface-variant">
        {summary.percentage === null
          ? "Não há atividades com previsão elegível para o cálculo."
          : `${summary.percentage}% no prazo (${summary.onTime} de ${summary.eligible} atividades elegíveis).`}
      </p>
    </section>
  );
}

function NaturePanel({ consolidated }: { consolidated: ExecutiveBookConsolidated }): ReactElement {
  return (
    <section
      className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
      aria-labelledby="book-consolidated-nature-heading"
    >
      <h3 id="book-consolidated-nature-heading" className="text-headline-sm text-on-surface">
        Natureza
      </h3>
      <ul className="mt-3 flex flex-col gap-2 text-body-sm">
        {consolidated.natureSummary.map((nature) => (
          <li key={nature.key} className="flex items-center justify-between gap-3">
            <span className="text-on-surface-variant">{nature.label}</span>
            <span className="font-mono text-code-sm text-on-surface">
              {nature.count} ({nature.percentage}%)
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-2 border-t border-outline-variant/40 pt-3 text-body-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
          verified
        </span>
        <span>
          <span className="font-mono text-code-sm text-on-surface">{consolidated.deliveriesCount}</span>{" "}
          {pluralize(consolidated.deliveriesCount, "entrega de valor registrada", "entregas de valor registradas")}
        </span>
      </p>
    </section>
  );
}

export function BookConsolidated({ consolidated, dataBase, areaHref }: BookConsolidatedProps): ReactElement {
  const isEmpty = consolidated.totalActivities === 0;

  return (
    <article className="flex flex-col gap-space-md" aria-labelledby="book-consolidated-heading">
      <header className="flex flex-col gap-1 border-b border-outline-variant/50 pb-space-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">
            insights
          </span>
          <h2 id="book-consolidated-heading" className="text-headline-lg text-on-surface">
            Visão consolidada · Todas as áreas
          </h2>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          Data base {formatCivilDatePtBr(dataBase)} · {consolidated.totalAreas}{" "}
          {pluralize(consolidated.totalAreas, "área", "áreas")} · {consolidated.totalActivities}{" "}
          {pluralize(consolidated.totalActivities, "atividade", "atividades")}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-space-md sm:grid-cols-3 lg:grid-cols-6">
        <BookKpiCard
          icon="assignment"
          value={consolidated.totalActivities.toLocaleString("pt-BR")}
          label="Atividades no período"
        />
        <BookKpiCard
          icon="task_alt"
          value={consolidated.done.toLocaleString("pt-BR")}
          label="Concluídas"
          hint={`${consolidated.donePercentage}% do total`}
          tone="positive"
        />
        <BookKpiCard
          icon="schedule"
          value={consolidated.onTimePercentage === null ? "—" : `${consolidated.onTimePercentage}%`}
          label="No prazo"
          hint={
            consolidated.eligible === 0
              ? "sem elegíveis"
              : `${consolidated.onTime}/${consolidated.eligible} elegíveis`
          }
        />
        <BookKpiCard
          icon="warning"
          value={consolidated.overdue.toLocaleString("pt-BR")}
          label="Atrasadas"
          tone={consolidated.overdue > 0 ? "critical" : "neutral"}
        />
        <BookKpiCard
          icon="block"
          value={consolidated.blocked.toLocaleString("pt-BR")}
          label="Bloqueadas"
          tone={consolidated.blocked > 0 ? "warning" : "neutral"}
        />
        <BookKpiCard
          icon="folder"
          value={consolidated.totalProjects.toLocaleString("pt-BR")}
          label="Projetos"
        />
      </div>

      {isEmpty ? (
        <div className="rounded-xl bg-surface-container-lowest p-space-md text-center text-body-sm text-on-surface-variant shadow-sm">
          Sem atividades no período selecionado para compor os indicadores de status, prazo e natureza.
        </div>
      ) : (
        <div className="grid gap-space-md lg:grid-cols-3">
          <StatusDistributionPanel consolidated={consolidated} />
          <DeadlineStatusPanel consolidated={consolidated} />
          <NaturePanel consolidated={consolidated} />
        </div>
      )}

      <BookAreasOverview areas={consolidated.areas} totals={consolidated} areaHref={areaHref} />
    </article>
  );
}
