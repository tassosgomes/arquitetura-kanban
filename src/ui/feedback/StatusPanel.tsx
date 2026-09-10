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
    <section role={role} className="flex max-w-xl flex-col gap-4">
      {eyebrow ? (
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">{title}</h1>
      <p className="text-lg leading-7 text-zinc-700">{message}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </section>
  );
}
