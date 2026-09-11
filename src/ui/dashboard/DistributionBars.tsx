import type {
  ManagementDistributionBucket,
  ManagementDistributionId,
  ManagementDistributions,
} from "@/application/reports/types";
import { MANAGEMENT_DISTRIBUTION_IDS } from "@/application/reports/types";
import { MANAGEMENT_DISTRIBUTION_LABELS } from "@/application/reports/labels";
import { CANONICAL_AREA_NOTE } from "@/application/reports/canonical-notes";

type DistributionBarsProps = {
  distributions: ManagementDistributions;
};

function BarList({ buckets }: { buckets: ManagementDistributionBucket[] }) {
  if (buckets.length === 0) {
    return <p className="text-sm text-zinc-500">Sem dados nesta dimensão no retrato.</p>;
  }

  const max = Math.max(...buckets.map((bucket) => bucket.count));

  return (
    <ul className="flex flex-col gap-3">
      {buckets.map((bucket) => {
        const width = max === 0 ? 0 : Math.round((bucket.count / max) * 100);
        return (
          <li key={bucket.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-zinc-800">{bucket.label}</span>
              <span className="shrink-0 font-medium text-zinc-900">{bucket.count}</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-zinc-100"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={bucket.count}
              aria-label={`${bucket.label}: ${bucket.count}`}
            >
              <div className="h-full rounded-full bg-zinc-800" style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DistributionBars({ distributions }: DistributionBarsProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="dashboard-distribuicoes">
      <h2 id="dashboard-distribuicoes" className="text-lg font-semibold text-zinc-900">
        Distribuições
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {MANAGEMENT_DISTRIBUTION_IDS.map((id: ManagementDistributionId) => (
          <article
            key={id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{id}</p>
              <h3 className="text-base font-semibold text-zinc-900">
                {MANAGEMENT_DISTRIBUTION_LABELS[id]}
              </h3>
            </div>
            {id === "D-AREA" ? (
              <p className="text-sm leading-6 text-zinc-600">{CANONICAL_AREA_NOTE}</p>
            ) : null}
            <BarList buckets={distributions[id]} />
          </article>
        ))}
      </div>
    </section>
  );
}
