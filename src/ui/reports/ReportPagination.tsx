import Link from "next/link";

type ReportPaginationProps = {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
};

export function ReportPagination({ page, totalPages, hrefForPage }: ReportPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const previous = page > 1 ? hrefForPage(page - 1) : null;
  const next = page < totalPages ? hrefForPage(page + 1) : null;

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
      aria-label="Paginação do relatório"
    >
      {previous ? (
        <Link
          href={previous}
          className="rounded-md px-3 py-1.5 font-medium text-zinc-900 underline hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Anterior
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-zinc-400">Anterior</span>
      )}
      <p className="text-zinc-700">
        Página {page} de {totalPages}
      </p>
      {next ? (
        <Link
          href={next}
          className="rounded-md px-3 py-1.5 font-medium text-zinc-900 underline hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Próxima
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-zinc-400">Próxima</span>
      )}
    </nav>
  );
}
