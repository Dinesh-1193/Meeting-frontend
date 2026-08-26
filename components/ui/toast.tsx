"use client";

import { X } from "lucide-react";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
            t.variant === "error" &&
              "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-100",
            t.variant === "success" &&
              "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
            t.variant === "info" &&
              "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description ? (
                <p className="mt-0.5 text-xs opacity-80">{t.description}</p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
