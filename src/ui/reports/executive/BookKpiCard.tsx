import type { ReactElement } from "react";

export type BookKpiCardTone = "neutral" | "positive" | "warning" | "critical";

export type BookKpiCardProps = {
  icon: string;
  value: string;
  label: string;
  hint?: string;
  tone?: BookKpiCardTone;
};

const TONE_ICON_BADGE: Record<BookKpiCardTone, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  positive: "bg-tertiary-fixed text-on-tertiary-fixed",
  warning: "bg-surface-container-high text-secondary",
  critical: "bg-error/10 text-error",
};

const TONE_VALUE: Record<BookKpiCardTone, string> = {
  neutral: "text-on-surface",
  positive: "text-on-surface",
  warning: "text-secondary",
  critical: "text-error",
};

export function BookKpiCard({ icon, value, label, hint, tone = "neutral" }: BookKpiCardProps): ReactElement {
  return (
    <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_ICON_BADGE[tone]}`}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <p className={`text-headline-md font-semibold ${TONE_VALUE[tone]}`}>{value}</p>
      <p className="text-body-sm text-on-surface-variant">{label}</p>
      {hint ? <p className="text-label-sm text-outline">{hint}</p> : null}
    </div>
  );
}
