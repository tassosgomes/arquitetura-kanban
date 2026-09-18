import Link from "next/link";

export type BookSidebarArea = {
  id: string;
  label: string;
  href: string;
  isActive?: boolean;
  count?: number;
};

export type BookSidebarProps = {
  areas: readonly BookSidebarArea[];
  selectedAreaId?: string | null;
  allAreasHref: string;
};

function linkClassName(selected: boolean): string {
  return `group flex min-w-0 items-center gap-space-sm rounded-xl px-space-sm py-2 text-label-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
    selected
      ? "bg-primary-container text-on-primary shadow-sm"
      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
  }`;
}

export function BookSidebar({ areas, selectedAreaId = null, allAreasHref }: BookSidebarProps) {
  const allAreasSelected = selectedAreaId === null;

  return (
    <nav
      aria-label="Áreas solicitantes"
      className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
    >
      <h2 className="px-space-sm pb-space-sm text-label-sm font-semibold uppercase tracking-wider text-outline">
        Áreas solicitantes
      </h2>

      <ul aria-label="Árvore de áreas solicitantes" className="flex flex-col gap-1">
        <li>
          <Link
            href={allAreasHref}
            aria-current={allAreasSelected ? "page" : undefined}
            className={linkClassName(allAreasSelected)}
          >
            <span className="material-symbols-outlined shrink-0 text-[18px]" aria-hidden="true">
              account_tree
            </span>
            <span className="min-w-0 flex-1 truncate">Todas as áreas</span>
          </Link>

          {areas.length > 0 ? (
            <ul
              className="mt-1 ml-3 flex flex-col gap-1 border-l border-outline-variant pl-3"
              aria-label="Áreas cadastradas"
            >
              {areas.map((area) => {
                const selected = selectedAreaId === area.id;
                const inactive = area.isActive === false;
                const countLabel =
                  typeof area.count === "number"
                    ? `${area.count} ${area.count === 1 ? "atividade" : "atividades"}`
                    : null;

                return (
                  <li key={area.id}>
                    <Link
                      href={area.href}
                      aria-current={selected ? "page" : undefined}
                      className={linkClassName(selected)}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {area.label}
                        {inactive ? <span className="text-label-sm opacity-75"> (inativa)</span> : null}
                      </span>
                      {countLabel ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm font-semibold ${
                            selected
                              ? "bg-on-primary/15 text-on-primary"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          <span aria-hidden="true">{area.count}</span>
                          <span className="sr-only">{countLabel}</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </li>
      </ul>
    </nav>
  );
}
