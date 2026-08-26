"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Horizontal padding for page chrome (titles, filters). Tables sit outside this. */
export function PageInset({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 w-full px-4 sm:px-5 md:px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Scrollable padded page body for non-table dashboard views. */
export function PageBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-5 md:px-6 md:py-6 lg:px-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
