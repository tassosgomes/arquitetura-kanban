"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/kanban",
    label: "Kanban",
    isActive: (pathname) => pathname === "/" || pathname.startsWith("/kanban"),
  },
  {
    href: "/projects",
    label: "Projetos",
    isActive: (pathname) => pathname.startsWith("/projects"),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    isActive: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    href: "/reports",
    label: "Relatórios",
    isActive: (pathname) => pathname.startsWith("/reports"),
  },
  {
    href: "/catalogs",
    label: "Cadastros",
    isActive: (pathname) => pathname.startsWith("/catalogs"),
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className="border-b border-zinc-200 bg-white lg:border-b-0 lg:border-r">
      <ul className="flex flex-wrap gap-1 px-4 py-3 lg:flex-col lg:gap-0.5 lg:px-3 lg:py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
