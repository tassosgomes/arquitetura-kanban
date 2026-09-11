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

  if (pathname.endsWith("/edit") || pathname.endsWith("/new")) {
    return null;
  }

  return (
    <nav aria-label="Seções do projeto" className="border-b border-outline-variant">
      <ul className="flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const href = `${base}${tab.suffix}`;
          const active = tab.suffix === "" ? pathname === base : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-t-lg px-3 py-2 text-label-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
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
