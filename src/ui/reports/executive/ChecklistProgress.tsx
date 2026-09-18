import type { ReactElement } from "react";

export function ChecklistProgress({ done, total }: { done: number; total: number }): ReactElement {
  if (total === 0) {
    return <span className="text-outline">—</span>;
  }

  // Defensive: `done` should never exceed `total`, but never let the bar
  // overflow the layout if that assumption is ever wrong upstream.
  const safeDone = Math.max(0, done);
  const percentage = Math.min(100, Math.round((safeDone / total) * 100));

  return (
    <span
      role="img"
      aria-label={`${done} de ${total} itens concluídos`}
      className="inline-flex items-center gap-2"
    >
      <span
        className="relative h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-surface-container-high"
        aria-hidden="true"
      >
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </span>
      <span className="font-mono text-code-sm text-on-surface-variant" aria-hidden="true">
        {done}/{total}
      </span>
    </span>
  );
}
