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
    <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white" aria-labelledby="relatorio-resumo">
      <table className="min-w-full text-left text-sm">
        <caption id="relatorio-resumo" className="px-4 py-3 text-left text-sm font-semibold text-zinc-900">
          Resumo do recorte
        </caption>
        <thead className="border-y border-zinc-200 bg-zinc-50 text-zinc-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Indicador
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Valor
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {MANAGEMENT_INDICATOR_IDS.map((id) => (
            <tr key={id}>
              <th scope="row" className="px-4 py-3 font-medium text-zinc-800">
                <span className="mr-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  {id}
                </span>
                {MANAGEMENT_INDICATOR_LABELS[id]}
                {id === "I-01" && cancelled > 0 ? (
                  <span className="mt-1 block text-xs font-normal text-zinc-600">
                    dos quais {cancelled} {cancelled === 1 ? "cancelada" : "canceladas"}
                  </span>
                ) : null}
                <span className="mt-1 block text-xs font-normal text-zinc-500">
                  {MANAGEMENT_INDICATOR_HINTS[id]}
                </span>
                {id === "I-04" ? (
                  <span className="mt-1 block text-xs font-normal text-zinc-600">{CANONICAL_AREA_NOTE}</span>
                ) : null}
              </th>
              <td className="px-4 py-3 text-lg font-semibold tabular-nums text-zinc-900">
                {indicators[id]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
