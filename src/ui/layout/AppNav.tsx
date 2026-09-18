"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/kanban",
    label: "Kanban",
    icon: "view_kanban",
    isActive: (pathname) => pathname === "/" || pathname.startsWith("/kanban"),
  },
  {
    href: "/projects",
    label: "Projetos",
    icon: "folder_special",
    isActive: (pathname) => pathname.startsWith("/projects"),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "monitoring",
    isActive: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    href: "/reports/executive",
    label: "Book",
    icon: "menu_book",
    isActive: (pathname) => pathname === "/reports" || pathname.startsWith("/reports/"),
  },
  {
    href: "/catalogs",
    label: "Cadastros",
    icon: "app_registration",
    isActive: (pathname) => pathname.startsWith("/catalogs"),
  },
];

export function AppNav({
  orientation = "vertical",
  collapsed = false,
}: {
  orientation?: "vertical" | "horizontal";
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const isHorizontal = orientation === "horizontal";
  const isCollapsed = !isHorizontal && collapsed;

  return (
    <nav aria-label="Principal">
      <ul className={isHorizontal ? "flex flex-wrap gap-1 px-space-sm py-space-sm" : "flex flex-col gap-1"}>
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={isCollapsed ? item.label : undefined}
                className={`group flex items-center gap-space-md rounded-xl px-space-md py-2.5 text-label-md font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isCollapsed ? "justify-center px-2" : ""
                } ${
                  active
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  {item.icon}
                </span>
                <span className={isCollapsed ? "sr-only" : "flex-1"}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
