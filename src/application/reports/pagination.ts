export const REPORT_PAGE_SIZE = 20;

export type PageSlice<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

/** UI-only pagination. CSV always uses the full collection. */
export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize = REPORT_PAGE_SIZE,
): PageSlice<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current =
    Number.isFinite(page) && page >= 1 ? Math.min(Math.trunc(page), totalPages) : 1;
  const start = (current - 1) * pageSize;
  return {
    page: current,
    pageSize,
    total,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}
