import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[160px] flex-col items-center justify-center gap-3 text-[var(--muted)]",
        className,
      )}
      role="status"
    >
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--accent)]" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center",
        className,
      )}
      style={{
        borderColor: "var(--border)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--surface) 70%, transparent), color-mix(in srgb, var(--surface-2) 80%, transparent))",
      }}
    >
      {icon ? (
        <div
          className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--accent)",
          }}
        >
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs leading-relaxed text-[var(--muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
