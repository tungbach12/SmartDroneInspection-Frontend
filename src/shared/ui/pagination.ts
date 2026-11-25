export interface PaginatedSlice<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

/**
 * Slices an in-memory collection for 1-based page controls, clamping out-of-range pages.
 */
export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize = 10,
): PaginatedSlice<T> {
  const safePageSize = Math.max(1, pageSize);
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const safePage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (safePage - 1) * safePageSize;

  return {
    items: items.slice(startIndex, startIndex + safePageSize),
    totalCount,
    totalPages,
    page: safePage,
    pageSize: safePageSize,
  };
}
