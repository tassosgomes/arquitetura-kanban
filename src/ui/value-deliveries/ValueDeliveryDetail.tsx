import type { ReactNode } from "react";
import Link from "next/link";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";
import type { ValueDeliveryRecord } from "@/application/value-deliveries";
import { formatCivilDatePtBr, formatUserLabel } from "@/ui/projects/project-types";
import { MarkdownView } from "@/ui/markdown/MarkdownView";

function formatInstant(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(value);
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-zinc-600">{label}</dt>
      <dd className="text-sm text-zinc-900">{children}</dd>
    </div>
  );
}

type ValueDeliveryDetailProps = {
  delivery: ValueDeliveryRecord;
  canWrite: boolean;
};

export function ValueDeliveryDetail({ delivery, canWrite }: ValueDeliveryDetailProps) {
  const viewHref = `/projects/${delivery.projectId}/value-deliveries`;

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            <Link href={viewHref} className="font-medium text-zinc-700 underline hover:text-zinc-900">
              Entregas de valor
            </Link>
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">{delivery.title}</h2>
        </div>
        {canWrite ? (
          <Link
            href={`/projects/${delivery.projectId}/value-deliveries/${delivery.id}/edit`}
            className="inline-flex shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Editar
          </Link>
        ) : null}
      </div>

      <dl className="flex max-w-3xl flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5">
        <Item label="Data de referência">{formatCivilDatePtBr(delivery.referenceDate)}</Item>
        <Item label="Autor">{formatUserLabel(delivery.author)}</Item>
        <Item label="Criado em">{formatInstant(delivery.createdAt)}</Item>
        <Item label="Atualizado em">{formatInstant(delivery.updatedAt)}</Item>
      </dl>

      <section
        aria-label="Conteúdo"
        className="max-w-3xl rounded-lg border border-zinc-200 bg-white p-5"
      >
        <MarkdownView markdown={delivery.contentMarkdown} />
      </section>
    </article>
  );
}
