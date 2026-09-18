import type { ExecutiveBookDeadlineSummary } from "@/application/reports/executive-book";
import { DeadlineBadge } from "@/ui/reports/executive/DeadlineBadge";

export function BookLegend({
  summary,
  headingId = "book-legenda",
}: {
  summary: ExecutiveBookDeadlineSummary;
  headingId?: string;
}) {
  return (
    <section
      className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className="text-headline-sm text-on-surface">
        Status prazo
      </h3>
      <ul className="mt-3 grid gap-2 text-body-sm sm:grid-cols-2">
        {summary.byStatus.map((item) => (
          <li key={item.status} className="flex items-center justify-between gap-2">
            <DeadlineBadge status={item.status} label={item.label} />
            <span className="font-mono text-code-sm text-on-surface-variant">{item.count}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-body-sm text-on-surface-variant">
        {summary.percentage === null
          ? "Não há atividades com previsão elegível para o cálculo."
          : `${summary.percentage}% no prazo (${summary.onTime} de ${summary.eligible} atividades elegíveis).`}
      </p>
    </section>
  );
}
