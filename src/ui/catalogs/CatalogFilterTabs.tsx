"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CatalogListFilter } from "@/application/catalogs/types";

const FILTERS: { value: CatalogListFilter; label: string }[] = [
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "all", label: "Todos" },
];

type CatalogFilterTabsProps = {
  basePath: "/catalogs/areas" | "/catalogs/domains";
};

export function CatalogFilterTabs({ basePath }: CatalogFilterTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("status") as CatalogListFilter | null) ?? "active";

  if (pathname !== basePath) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por situação">
      {FILTERS.map((filter) => {
        const href = filter.value === "active" ? basePath : `${basePath}?status=${filter.value}`;
        const selected = current === filter.value;

        return (
          <Link
            key={filter.value}
            href={href}
            role="tab"
            aria-selected={selected}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
              selected
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
