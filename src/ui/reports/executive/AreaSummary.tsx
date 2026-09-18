import type { ExecutiveBookArea } from "@/application/reports/executive-book";
import { ACTIVITY_STATUS_ICON } from "@/ui/activities/ActivityStatusBadge";

export function AreaSummary({
  area,
  headingId = "book-resumo-area",
}: {
  area: ExecutiveBookArea;
  headingId?: string;
}) {
  // Zero-count rows are noise ("Backlog 0 (0%)"), so they're hidden here.
  const visibleStatuses = area.statusSummary.filter((status) => status.count > 0);

  return (
    <section
      className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className="text-headline-sm text-on-surface">
        Resumo da área
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-body-sm">
        <div>
          <dt className="text-on-surface-variant">Projetos</dt>
          <dd className="text-headline-md font-semibold text-on-surface">{area.totalProjects}</dd>
          {/* Different scope than "Atividades" below: whole history, by responsible area. */}
          <p className="text-label-sm text-outline">da área responsável, total</p>
        </div>
        <div>
          <dt className="text-on-surface-variant">Atividades</dt>
          <dd className="text-headline-md font-semibold text-on-surface">{area.activities.length}</dd>
          {/* Different scope than "Projetos" above: only the period recut, by requesting area. */}
          <p className="text-label-sm text-outline">no recorte, área solicitante</p>
        </div>
      </dl>
      {visibleStatuses.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {visibleStatuses.map((status) => (
            <li key={status.status} className="flex items-center justify-between gap-3 text-body-sm">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  {ACTIVITY_STATUS_ICON[status.status]}
                </span>
                {status.label}
              </span>
              <span className="font-mono text-code-sm text-on-surface">
                {status.count} ({status.percentage}%)
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-body-sm text-on-surface-variant">Sem atividades no recorte</p>
      )}
    </section>
  );
}
