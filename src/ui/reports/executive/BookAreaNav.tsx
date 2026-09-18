import Link from "next/link";
import type { ReactElement } from "react";

export type BookAreaNavItem = {
  id: string;
  label: string;
  href: string;
  count?: number;
  isActive?: boolean;
};

export type BookAreaNavProps = {
  areas: readonly BookAreaNavItem[];
  selectedAreaId?: string | null;
  allAreasHref: string;
  totalCount?: number;
};

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "atividade" : "atividades"}`;
}

function CountPill({ count, selected }: { count: number; selected: boolean }): ReactElement {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm font-semibold ${
        selected ? "bg-on-primary/15 text-on-primary" : "bg-surface-container-high text-on-surface-variant"
      }`}
    >
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{countLabel(count)}</span>
    </span>
  );
}

function chipClassName(selected: boolean, extra = ""): string {
  const base =
    "group flex shrink-0 items-center gap-space-sm rounded-full px-space-sm py-2 text-label-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const tone = selected
    ? "bg-primary-container text-on-primary shadow-sm"
    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";
  return `${base} ${tone} ${extra}`.trim();
}

export function BookAreaNav({
  areas,
  selectedAreaId = null,
  allAreasHref,
  totalCount,
}: BookAreaNavProps): ReactElement {
  const allAreasSelected = selectedAreaId === null;

  // `overflow-hidden` on the nav is what keeps the chip strip from widening the
  // document. The <ul> scrolls on its own, but its overflow still reaches the
  // page without this, and the whole Book gets a horizontal scrollbar.
  return (
    <nav
      aria-label="Áreas solicitantes"
      className="sticky top-0 z-20 min-w-0 overflow-hidden border-b border-outline-variant/60 bg-surface shadow-sm print:hidden"
    >
      <h2 className="px-space-md pt-space-sm text-label-sm font-semibold uppercase tracking-wider text-outline">
        Áreas solicitantes
      </h2>
      <ul className="flex min-w-0 items-center gap-1 overflow-x-auto px-space-md pb-space-sm pt-2">
        <li className="shrink-0">
          <Link
            href={allAreasHref}
            aria-current={allAreasSelected ? "page" : undefined}
            className={chipClassName(
              allAreasSelected,
              `sticky left-0 z-10 ${allAreasSelected ? "" : "bg-surface"}`,
            )}
          >
            <span className="material-symbols-outlined shrink-0 text-[18px]" aria-hidden="true">
              account_tree
            </span>
            <span className="whitespace-nowrap">Todas as áreas</span>
            {typeof totalCount === "number" ? (
              <CountPill count={totalCount} selected={allAreasSelected} />
            ) : null}
          </Link>
        </li>
        {areas.map((area) => {
          const selected = selectedAreaId === area.id;
          const inactive = area.isActive === false;

          return (
            <li key={area.id} className="shrink-0">
              <Link
                href={area.href}
                aria-current={selected ? "page" : undefined}
                className={chipClassName(selected)}
              >
                <span className="min-w-0 max-w-[14rem] truncate">
                  {area.label}
                  {inactive ? <span className="text-label-sm opacity-75"> (inativa)</span> : null}
                </span>
                {typeof area.count === "number" ? (
                  <CountPill count={area.count} selected={selected} />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
