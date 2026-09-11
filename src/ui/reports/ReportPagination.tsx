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
      className="flex flex-wrap items-center justify-between gap-3 text-body-sm"
      aria-label="Paginação do relatório"
    >
      {previous ? (
        <Link
          href={previous}
          className="rounded-md px-3 py-1.5 font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Anterior
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-outline">Anterior</span>
      )}
      <p className="text-on-surface-variant">
        Página {page} de {totalPages}
      </p>
      {next ? (
        <Link
          href={next}
          className="rounded-md px-3 py-1.5 font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Próxima
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-outline">Próxima</span>
      )}
    </nav>
  );
}
