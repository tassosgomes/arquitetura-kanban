import { CatalogSubNav } from "@/ui/catalogs/CatalogSubNav";

export default function CatalogsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-2">
        <h1 className="text-headline-lg text-on-surface">Cadastros</h1>
        <p className="max-w-2xl text-body-md leading-6 text-on-surface-variant">
          Gerencie áreas e categorias de arquitetura. Registros inativos permanecem legíveis, mas não
          entram em novas associações.
        </p>
      </header>
      <CatalogSubNav />
      {children}
    </div>
  );
}
