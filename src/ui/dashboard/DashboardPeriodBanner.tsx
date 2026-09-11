import type { ManagementPeriodView } from "@/application/reports/period-view";

type DashboardPeriodBannerProps = {
  view: ManagementPeriodView;
};

export function DashboardPeriodBanner({ view }: DashboardPeriodBannerProps) {
  return (
    <section
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
      aria-labelledby="dashboard-periodo"
    >
      <h2 id="dashboard-periodo" className="text-sm font-semibold text-zinc-900">
        {view.periodLabel}
      </h2>
      <p className="text-sm leading-6 text-zinc-700">{view.periodDatesText}</p>
      <p className="text-sm leading-6 text-zinc-700">{view.closingText}</p>
      <p className="text-sm leading-6 text-zinc-600">{view.semanticsText}</p>
    </section>
  );
}
