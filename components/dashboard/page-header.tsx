import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="ms-section-label mb-1.5">{eyebrow}</p> : null}
        <h2 className="ms-text-heading text-2xl font-semibold tracking-tight md:text-[1.65rem]">
          {title}
        </h2>
        {description ? (
          <p className="ms-text-muted mt-1.5 max-w-2xl text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
