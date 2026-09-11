import type { AriaRole, ReactNode } from "react";

type StatusPanelProps = {
  eyebrow?: string;
  title: string;
  message: string;
  action?: ReactNode;
  role?: AriaRole;
};

export function StatusPanel({ eyebrow, title, message, action, role }: StatusPanelProps) {
  return (
    <section role={role} className="flex max-w-xl flex-col gap-space-sm">
      {eyebrow ? (
        <p className="text-label-sm text-outline uppercase tracking-wider">{eyebrow}</p>
      ) : null}
      <h1 className="text-headline-lg text-on-surface">{title}</h1>
      <p className="text-body-lg text-on-surface-variant">{message}</p>
      {action ? <div className="pt-space-xs">{action}</div> : null}
    </section>
  );
}
