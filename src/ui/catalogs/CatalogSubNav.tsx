"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/catalogs", label: "Visão geral", exact: true },
  { href: "/catalogs/areas", label: "Áreas", exact: false },
  { href: "/catalogs/domains", label: "Domínios", exact: false },
];

export function CatalogSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Cadastros" className="border-b border-zinc-200">
      <ul className="flex flex-wrap gap-1">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-t-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                  active
                    ? "border border-b-0 border-zinc-200 bg-white text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
