import type { ExecutiveBookArea } from "@/application/reports/executive-book";

export function AreaSummary({
  area,
  headingId = "book-resumo-area",
}: {
  area: ExecutiveBookArea;
  headingId?: string;
}) {
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
        </div>
        <div>
          <dt className="text-on-surface-variant">Atividades</dt>
          <dd className="text-headline-md font-semibold text-on-surface">{area.activities.length}</dd>
        </div>
      </dl>
      <ul className="mt-4 flex flex-col gap-2">
        {area.statusSummary.map((status) => (
          <li key={status.status} className="flex items-center justify-between gap-3 text-body-sm">
            <span className="text-on-surface-variant">{status.label}</span>
            <span className="font-mono text-code-sm text-on-surface">
              {status.count} ({status.percentage}%)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
