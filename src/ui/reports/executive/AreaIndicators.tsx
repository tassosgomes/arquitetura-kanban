import type { ExecutiveBookArea } from "@/application/reports/executive-book";

export function AreaIndicators({
  area,
  headingId = "book-indicadores-area",
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
        Indicadores da área
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-body-sm">
        <div>
          <dt className="text-on-surface-variant">Atividades no período</dt>
          <dd className="text-headline-md font-semibold text-on-surface">{area.snapshot.indicators["I-01"]}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Concluídas</dt>
          <dd className="text-headline-md font-semibold text-on-surface">{area.snapshot.indicators["I-02"]}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">No prazo</dt>
          <dd className="text-headline-md font-semibold text-on-surface">
            {area.deadlineSummary.percentage === null ? "—" : `${area.deadlineSummary.percentage}%`}
          </dd>
          <p className="text-body-sm text-outline">
            {area.deadlineSummary.percentage === null
              ? "sem denominador elegível"
              : `${area.deadlineSummary.onTime}/${area.deadlineSummary.eligible} elegíveis`}
          </p>
        </div>
        <div>
          <dt className="text-on-surface-variant">Natureza</dt>
          <dd className="mt-1 flex flex-col gap-1 text-body-sm text-on-surface">
            {area.natureSummary.map((nature) => (
              <span key={nature.key}>
                {nature.label}: {nature.count} ({nature.percentage}%)
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </section>
  );
}
