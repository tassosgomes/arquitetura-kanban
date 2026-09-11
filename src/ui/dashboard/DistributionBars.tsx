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
    return <p className="text-body-sm text-on-surface-variant">Sem dados nesta dimensão no retrato.</p>;
  }

  const max = Math.max(...buckets.map((bucket) => bucket.count));

  return (
    <ul className="flex flex-col gap-3">
      {buckets.map((bucket) => {
        const width = max === 0 ? 0 : Math.round((bucket.count / max) * 100);
        return (
          <li key={bucket.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="min-w-0 truncate text-on-surface-variant">{bucket.label}</span>
              <span className="shrink-0 font-mono text-code-sm font-semibold text-on-surface">
                {bucket.count}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-container-highest"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={bucket.count}
              aria-label={`${bucket.label}: ${bucket.count}`}
            >
              <div className="h-full rounded-full bg-primary-container" style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DistributionBars({ distributions }: DistributionBarsProps) {
  return (
    <section className="flex flex-col gap-space-md" aria-labelledby="dashboard-distribuicoes">
      <h2 id="dashboard-distribuicoes" className="text-headline-md text-on-surface">
        Distribuições
      </h2>
      <div className="grid gap-space-md lg:grid-cols-2">
        {MANAGEMENT_DISTRIBUTION_IDS.map((id: ManagementDistributionId) => (
          <article
            key={id}
            className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
          >
            <div className="flex flex-col gap-1">
              <p className="font-mono text-code-sm font-semibold uppercase tracking-wider text-outline">
                {id}
              </p>
              <h3 className="text-headline-sm text-on-surface">
                {MANAGEMENT_DISTRIBUTION_LABELS[id]}
              </h3>
            </div>
            {id === "D-AREA" ? (
              <p className="text-body-sm leading-6 text-on-surface-variant">{CANONICAL_AREA_NOTE}</p>
            ) : null}
            <BarList buckets={distributions[id]} />
          </article>
        ))}
      </div>
    </section>
  );
}
