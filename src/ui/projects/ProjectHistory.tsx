"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ProjectHistoryPage } from "@/application/projects/project-history-types";
import { loadProjectHistoryAction } from "@/app/actions/projects";

type ProjectHistoryProps = {
  projectId: string;
  initialPage: ProjectHistoryPage;
};

const SOURCE_KIND_LABELS = {
  project: "Projeto",
  activity: "Atividade",
  valueDelivery: "Entrega de valor",
} as const;

export function ProjectHistory({ projectId, initialPage }: ProjectHistoryProps) {
  const [items, setItems] = useState(initialPage.items);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [oldestSequence, setOldestSequence] = useState(initialPage.oldestSequence);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!hasMore || oldestSequence == null) {
      return;
    }

    startTransition(async () => {
      const result = await loadProjectHistoryAction({
        projectId,
        beforeSequence: oldestSequence,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setError(null);
      setItems((current) => [...result.data.items, ...current]);
      setHasMore(result.data.hasMore);
      setOldestSequence(result.data.oldestSequence);
    });
  }

  return (
    <section className="flex max-w-3xl flex-col gap-4" aria-labelledby="project-history-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="project-history-heading" className="text-lg font-semibold text-zinc-900">
          Histórico
        </h2>
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="rounded-md px-2 py-1 text-sm font-medium text-zinc-700 underline hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline"
          >
            {pending ? "Carregando…" : "Carregar mais"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
          Nenhum evento registrado para este projeto.
        </p>
      ) : (
        <ol className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5">
          {items.map((item) => (
            <li
              key={item.sequence}
              className="border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0"
            >
              <p className="text-sm text-zinc-900">{item.summary}</p>
              <p className="mt-1 text-xs text-zinc-600">
                {item.occurredAt} · {item.actorLabel}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Origem:{" "}
                {item.sourceHref ? (
                  <Link href={item.sourceHref} className="font-medium underline hover:text-zinc-900">
                    {item.sourceLabel}
                  </Link>
                ) : (
                  item.sourceLabel
                )}{" "}
                ({SOURCE_KIND_LABELS[item.sourceKind]})
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
