import { CatalogSubNav } from "@/ui/catalogs/CatalogSubNav";

export default function CatalogsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Cadastros</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Gerencie áreas e domínios de arquitetura. Registros inativos permanecem legíveis, mas não
          entram em novas associações.
        </p>
      </header>
      <CatalogSubNav />
      {children}
    </div>
  );
}
