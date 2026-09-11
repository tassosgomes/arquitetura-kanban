import {
  MANAGEMENT_INDICATOR_IDS,
  type ManagementIndicators,
} from "@/application/reports/types";
import {
  MANAGEMENT_INDICATOR_HINTS,
  MANAGEMENT_INDICATOR_LABELS,
} from "@/application/reports/labels";
import { CANONICAL_AREA_NOTE } from "@/application/reports/canonical-notes";

type ReportSummaryTableProps = {
  indicators: ManagementIndicators;
};

export function ReportSummaryTable({ indicators }: ReportSummaryTableProps) {
  const cancelled = indicators["I-09"];

  return (
    <section
      className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm"
      aria-labelledby="relatorio-resumo"
    >
      <table className="min-w-full text-left text-body-sm">
        <caption id="relatorio-resumo" className="px-4 py-3 text-left text-headline-sm text-on-surface">
          Resumo do recorte
        </caption>
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Indicador
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Valor
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {MANAGEMENT_INDICATOR_IDS.map((id) => (
            <tr key={id} className="transition-colors hover:bg-primary-container/5">
              <th scope="row" className="px-4 py-3 font-semibold text-on-surface">
                <span className="mr-2 font-mono text-code-sm font-semibold uppercase tracking-wider text-outline">
                  {id}
                </span>
                {MANAGEMENT_INDICATOR_LABELS[id]}
                {id === "I-01" && cancelled > 0 ? (
                  <span className="mt-1 block text-body-sm font-normal text-on-surface-variant">
                    dos quais {cancelled} {cancelled === 1 ? "cancelada" : "canceladas"}
                  </span>
                ) : null}
                <span className="mt-1 block text-body-sm font-normal text-outline">
                  {MANAGEMENT_INDICATOR_HINTS[id]}
                </span>
                {id === "I-04" ? (
                  <span className="mt-1 block text-body-sm font-normal text-on-surface-variant">
                    {CANONICAL_AREA_NOTE}
                  </span>
                ) : null}
              </th>
              <td className="px-4 py-3 text-headline-md tabular-nums text-on-surface">
                {indicators[id]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
