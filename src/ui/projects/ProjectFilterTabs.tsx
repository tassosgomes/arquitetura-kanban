"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ProjectListFilter } from "@/application/projects";

const FILTERS: { value: ProjectListFilter; label: string }[] = [
  { value: "active", label: "Ativos" },
  { value: "cancelled", label: "Cancelados" },
  { value: "all", label: "Todos" },
];

export function ProjectFilterTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("status") as ProjectListFilter | null) ?? "active";

  if (pathname !== "/projects") {
    return null;
  }

  return (
    <div
      className="inline-flex flex-wrap gap-0.5 rounded-xl bg-surface-container-low p-1 shadow-inner"
      role="tablist"
      aria-label="Filtrar projetos por status"
    >
      {FILTERS.map((filter) => {
        const href = filter.value === "active" ? "/projects" : `/projects?status=${filter.value}`;
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
