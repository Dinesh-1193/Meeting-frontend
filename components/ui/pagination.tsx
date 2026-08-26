"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/use-client-pagination";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** When given with pageSize, renders a "Showing X–Y of Z" range on the left. */
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}

function buildPageItems(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const items: Array<number | "ellipsis"> = [0];
  const start = Math.max(1, page - 1);
  const end = Math.min(pageCount - 2, page + 1);

  if (start > 1) items.push("ellipsis");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < pageCount - 2) items.push("ellipsis");
  items.push(pageCount - 1);

  return items;
}

/**
 * Shared page-through control — used anywhere a list is split into pages.
 * Always renders (even for a single page) so pagination is a visible,
 * predictable part of every list rather than something that pops in/out.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}: PaginationProps) {
  const rangeStart = totalItems && totalItems > 0 ? page * (pageSize ?? 0) + 1 : 0;
  const rangeEnd =
    totalItems != null && pageSize != null
      ? Math.min((page + 1) * pageSize, totalItems)
      : undefined;
  const pageItems = buildPageItems(page, pageCount);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-3 border-t px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 md:px-5",
        className,
      )}
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
        {totalItems != null && pageSize != null ? (
          <span className="ms-text-muted text-xs">
            {totalItems === 0
              ? "0 results"
              : `Showing ${rangeStart}–${rangeEnd} of ${totalItems}`}
          </span>
        ) : null}

        {pageSize != null && onPageSizeChange ? (
          <label className="inline-flex items-center gap-2 text-xs ms-text-muted">
            <span className="whitespace-nowrap">Rows per page</span>
            <select
              className="h-8 rounded-md border bg-[var(--input-bg)] px-2 text-xs font-medium text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              style={{ borderColor: "var(--border)" }}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium ms-text-muted transition hover:bg-[var(--hover)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-0.5 px-1">
          {pageItems.map((item, idx) =>
            item === "ellipsis" ? (
              <span
                key={`e-${idx}`}
                className="flex h-8 w-8 items-center justify-center ms-text-muted text-xs"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item + 1}`}
                aria-current={page === item ? "page" : undefined}
                className={cn(
                  "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition",
                  page === item
                    ? "bg-[var(--accent)] text-white"
                    : "ms-text-muted hover:bg-[var(--hover)] hover:text-[var(--foreground)]",
                )}
              >
                {item + 1}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium ms-text-muted transition hover:bg-[var(--hover)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Clamps a page index that a filter/search change may have made invalid. */
export function clampPage(page: number, pageCount: number): number {
  return Math.min(page, Math.max(0, pageCount - 1));
}
