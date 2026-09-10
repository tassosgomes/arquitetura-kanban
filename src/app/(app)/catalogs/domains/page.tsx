import { Suspense } from "react";
import { listDomains } from "@/application/catalogs";
import type { CatalogListFilter } from "@/application/catalogs";
import {
  createDomainAction,
  deactivateDomainAction,
  renameDomainAction,
} from "@/app/actions/catalogs";
import {
  domainRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { CatalogFilterTabs } from "@/ui/catalogs/CatalogFilterTabs";
import { CatalogManager } from "@/ui/catalogs/CatalogManager";
import type { CatalogItemDto } from "@/ui/catalogs/catalog-types";

type DomainsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

function parseFilter(status: string | undefined): CatalogListFilter {
  if (status === "inactive" || status === "all") {
    return status;
  }
  return "active";
}

function toItemDto(item: { id: string; name: string; isActive: boolean }): CatalogItemDto {
  return { id: item.id, name: item.name, isActive: item.isActive };
}

export default async function DomainsPage({ searchParams }: DomainsPageProps) {
  const { status } = await searchParams;
  const filter = parseFilter(status);
  const actor = await requireActiveUser();
  const domains = await listDomains(actor, filter, domainRepository);

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <CatalogFilterTabs basePath="/catalogs/domains" />
      </Suspense>
      <CatalogManager
        items={domains.map(toItemDto)}
        labels={{
          singular: "domínio",
          plural: "domínios",
          createHeading: "Novo domínio",
          emptyTitle: filter === "inactive" ? "Nenhum domínio inativo" : "Nenhum domínio cadastrado",
          emptyMessage:
            filter === "inactive"
              ? "Domínios inativados permanecem visíveis para referências históricas."
              : "Os seis domínios iniciais podem ser renomeados ou inativados conforme necessário.",
        }}
        actions={{
          create: createDomainAction,
          rename: renameDomainAction,
          deactivate: deactivateDomainAction,
        }}
      />
    </div>
  );
}
