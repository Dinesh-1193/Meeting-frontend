"use client";

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Inset table panel that fills remaining viewport height without overflowing.
 * Outer padding keeps the card inside the content column; inner panel is w-full.
 */
export function DataTablePanel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 w-full flex-1 flex-col px-4 pb-4 sm:px-5 md:px-6 lg:px-8",
        className,
      )}
      {...props}
    >
      <div
        className="ms-panel flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function DataTableScroll({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-h-0 min-w-0 w-full flex-1 overflow-auto", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export const DataTable = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, style, ...props }, ref) => (
  <table
    ref={ref}
    className={cn("w-full table-fixed border-collapse text-sm", className)}
    style={{ width: "100%", tableLayout: "fixed", ...style }}
    {...props}
  />
));
DataTable.displayName = "DataTable";

export const DataTableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, style, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "sticky top-0 z-[1] border-b text-left text-xs font-semibold uppercase tracking-wide ms-text-muted",
      className,
    )}
    style={{
      borderColor: "var(--border)",
      background: "color-mix(in srgb, var(--surface-2) 70%, var(--surface))",
      ...style,
    }}
    {...props}
  />
));
DataTableHeader.displayName = "DataTableHeader";

export const DataTableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn(className)} {...props} />
));
DataTableBody.displayName = "DataTableBody";

export const DataTableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, style, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b last:border-b-0 transition-colors hover:bg-[var(--hover)]",
      className,
    )}
    style={{ borderColor: "var(--border)", ...style }}
    {...props}
  />
));
DataTableRow.displayName = "DataTableRow";

export const DataTableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "whitespace-nowrap px-3 py-2.5 text-left font-semibold first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5 md:px-5 md:first:pl-6 md:last:pr-6",
      className,
    )}
    {...props}
  />
));
DataTableHead.displayName = "DataTableHead";

export const DataTableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "overflow-hidden px-3 py-2.5 align-middle first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5 md:px-5 md:first:pl-6 md:last:pr-6",
      className,
    )}
    {...props}
  />
));
DataTableCell.displayName = "DataTableCell";

/** Full-width body placeholder so the table keeps layout when empty/loading. */
export function DataTablePlaceholder({
  colSpan,
  children,
  className,
}: {
  colSpan: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DataTableRow className="hover:bg-transparent">
      <DataTableCell colSpan={colSpan} className={cn("p-0", className)}>
        <div className="flex w-full min-h-[min(50vh,360px)] items-center justify-center px-4">
          {children}
        </div>
      </DataTableCell>
    </DataTableRow>
  );
}
