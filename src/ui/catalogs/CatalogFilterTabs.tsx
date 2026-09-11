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
    <div
      className="inline-flex flex-wrap gap-0.5 rounded-xl bg-surface-container-low p-1 shadow-inner"
      role="tablist"
      aria-label="Filtrar por situação"
    >
      {FILTERS.map((filter) => {
        const href = filter.value === "active" ? basePath : `${basePath}?status=${filter.value}`;
        const selected = current === filter.value;

        return (
          <Link
            key={filter.value}
            href={href}
            role="tab"
            aria-selected={selected}
            className={`rounded-lg px-3 py-1.5 text-label-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              selected
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
