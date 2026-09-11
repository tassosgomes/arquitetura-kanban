import type { ManagementIndicators } from "@/application/reports/types";
import {
  MANAGEMENT_INDICATOR_HINTS,
  MANAGEMENT_INDICATOR_LABELS,
} from "@/application/reports/labels";
import { MANAGEMENT_INDICATOR_IDS } from "@/application/reports/types";
import { CANONICAL_AREA_NOTE } from "@/application/reports/canonical-notes";

type IndicatorCardsProps = {
  indicators: ManagementIndicators;
};

export function IndicatorCards({ indicators }: IndicatorCardsProps) {
  const cancelled = indicators["I-09"];

  return (
    <section aria-labelledby="dashboard-indicadores">
      <h2 id="dashboard-indicadores" className="sr-only">
        Indicadores
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MANAGEMENT_INDICATOR_IDS.map((id) => {
          const value = indicators[id];
          const isAreaCard = id === "I-04";
          return (
            <li
              key={id}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{id}</p>
              <p className="text-sm font-medium text-zinc-700">{MANAGEMENT_INDICATOR_LABELS[id]}</p>
              <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
              {id === "I-01" && cancelled > 0 ? (
                <p className="text-sm text-zinc-600">
                  dos quais {cancelled} {cancelled === 1 ? "cancelada" : "canceladas"}
                </p>
              ) : null}
              <p className="text-xs leading-5 text-zinc-500">{MANAGEMENT_INDICATOR_HINTS[id]}</p>
              {isAreaCard ? (
                <p className="text-xs leading-5 text-zinc-600">{CANONICAL_AREA_NOTE}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
