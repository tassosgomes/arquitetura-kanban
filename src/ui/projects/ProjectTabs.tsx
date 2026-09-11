"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ProjectTabsProps = {
  projectId: string;
};

const TABS = [
  { suffix: "", label: "Visão geral" },
  { suffix: "/activities", label: "Atividades" },
  { suffix: "/value-deliveries", label: "Entregas de valor" },
  { suffix: "/history", label: "Histórico" },
] as const;

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  if (pathname.endsWith("/edit")) {
    return null;
  }

  return (
    <nav aria-label="Seções do projeto" className="border-b border-zinc-200">
      <ul className="flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const href = `${base}${tab.suffix}`;
          const active = tab.suffix === "" ? pathname === base : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-t-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                  active
                    ? "border border-b-0 border-zinc-200 bg-white text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
