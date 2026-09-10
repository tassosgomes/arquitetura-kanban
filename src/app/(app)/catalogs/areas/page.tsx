import { Suspense } from "react";
import { listAreas } from "@/application/catalogs";
import type { CatalogListFilter } from "@/application/catalogs";
import {
  createAreaAction,
  deactivateAreaAction,
  renameAreaAction,
} from "@/app/actions/catalogs";
import {
  areaRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { CatalogFilterTabs } from "@/ui/catalogs/CatalogFilterTabs";
import { CatalogManager } from "@/ui/catalogs/CatalogManager";
import type { CatalogItemDto } from "@/ui/catalogs/catalog-types";

type AreasPageProps = {
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

export default async function AreasPage({ searchParams }: AreasPageProps) {
  const { status } = await searchParams;
  const filter = parseFilter(status);
  const actor = await requireActiveUser();
  const areas = await listAreas(actor, filter, areaRepository);

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <CatalogFilterTabs basePath="/catalogs/areas" />
      </Suspense>
      <CatalogManager
        items={areas.map(toItemDto)}
        labels={{
          singular: "área",
          plural: "áreas",
          createHeading: "Nova área",
          emptyTitle: filter === "inactive" ? "Nenhuma área inativa" : "Nenhuma área cadastrada",
          emptyMessage:
            filter === "inactive"
              ? "Áreas inativadas aparecem aqui para consulta de referências antigas."
              : "Crie a primeira área para vincular projetos e atividades.",
        }}
        actions={{
          create: createAreaAction,
          rename: renameAreaAction,
          deactivate: deactivateAreaAction,
        }}
      />
    </div>
  );
}
