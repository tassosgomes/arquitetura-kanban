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
    <nav aria-label="Cadastros" className="border-b border-outline-variant">
      <ul className="flex flex-wrap gap-1">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-t-lg px-3 py-2 text-label-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
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
