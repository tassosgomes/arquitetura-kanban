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

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

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
    <section className="flex max-w-3xl flex-col gap-space-md" aria-labelledby="project-history-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="project-history-heading" className="text-headline-md text-on-surface">
          Histórico
        </h2>
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="rounded-md px-2 py-1 text-label-md font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-outline disabled:no-underline"
          >
            {pending ? "Carregando…" : "Carregar mais"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-6 text-body-sm text-on-surface-variant">
          Nenhum evento registrado para este projeto.
        </p>
      ) : (
        <ol className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          {items.map((item) => (
            <li key={item.sequence} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-on-secondary">
                {initials(item.actorLabel)}
              </div>
              <div className="flex-1 rounded-xl bg-surface-container-low p-2.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-label-sm font-semibold text-on-surface">{item.actorLabel}</span>
                  <span className="font-mono text-code-sm text-outline">{item.occurredAt}</span>
                </div>
                <p className="text-body-sm text-on-surface">{item.summary}</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Origem:{" "}
                  {item.sourceHref ? (
                    <Link href={item.sourceHref} className="font-medium text-primary hover:underline">
                      {item.sourceLabel}
                    </Link>
                  ) : (
                    item.sourceLabel
                  )}{" "}
                  ({SOURCE_KIND_LABELS[item.sourceKind]})
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
