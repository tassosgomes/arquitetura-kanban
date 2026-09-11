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
      <ul className="grid gap-space-sm sm:grid-cols-2 xl:grid-cols-4">
        {MANAGEMENT_INDICATOR_IDS.map((id) => {
          const value = indicators[id];
          const isAreaCard = id === "I-04";
          return (
            <li
              key={id}
              className="flex flex-col gap-1.5 rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
            >
              <p className="font-mono text-code-sm font-semibold uppercase tracking-wider text-outline">
                {id}
              </p>
              <p className="text-body-sm text-on-surface-variant">{MANAGEMENT_INDICATOR_LABELS[id]}</p>
              <p className="text-headline-xl text-on-surface">{value}</p>
              {id === "I-01" && cancelled > 0 ? (
                <p className="text-body-sm text-on-surface-variant">
                  dos quais {cancelled} {cancelled === 1 ? "cancelada" : "canceladas"}
                </p>
              ) : null}
              <p className="text-body-sm leading-5 text-outline">{MANAGEMENT_INDICATOR_HINTS[id]}</p>
              {isAreaCard ? (
                <p className="text-body-sm leading-5 text-on-surface-variant">{CANONICAL_AREA_NOTE}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
