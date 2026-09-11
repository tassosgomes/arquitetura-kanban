import type { ManagementPeriodView } from "@/application/reports/period-view";

type DashboardPeriodBannerProps = {
  view: ManagementPeriodView;
};

export function DashboardPeriodBanner({ view }: DashboardPeriodBannerProps) {
  return (
    <section
      className="flex flex-col gap-1.5 rounded-xl bg-primary-container/10 px-space-md py-space-sm"
      aria-labelledby="dashboard-periodo"
    >
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
          event_available
        </span>
        <h2 id="dashboard-periodo" className="text-label-md font-semibold text-on-surface">
          {view.periodLabel}
        </h2>
      </div>
      <p className="text-body-sm leading-6 text-on-surface-variant">{view.periodDatesText}</p>
      <p className="text-body-sm leading-6 text-on-surface-variant">{view.closingText}</p>
      <p className="text-body-sm leading-6 text-outline">{view.semanticsText}</p>
    </section>
  );
}
