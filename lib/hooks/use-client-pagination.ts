"use client";

import { useMemo, useState } from "react";
import { clampPage } from "@/components/ui/pagination";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Client-side slice pagination for full in-memory lists
 * (meetings / recordings / contacts).
 */
export function useClientPagination<T>(
  items: T[],
  initialPageSize: number = DEFAULT_PAGE_SIZE,
) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = clampPage(page, pageCount);
  const paged = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize],
  );

  const setPageSize = (next: number) => {
    setPageSizeState(next);
    setPage(0);
  };

  return {
    page: safePage,
    setPage,
    resetPage: () => setPage(0),
    pageCount,
    pageSize,
    setPageSize,
    paged,
    totalItems: items.length,
  };
}
