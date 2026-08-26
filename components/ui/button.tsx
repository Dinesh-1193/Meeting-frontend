"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-[var(--accent)] text-white shadow-sm shadow-sky-600/25 hover:bg-[var(--accent-strong)] hover:shadow-md hover:shadow-sky-600/20":
              variant === "primary",
            "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--hover)]":
              variant === "secondary",
            "bg-transparent text-[var(--muted-strong)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]":
              variant === "ghost",
            "bg-[var(--danger)] text-white hover:opacity-90": variant === "danger",
            "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm hover:bg-[var(--hover)] hover:border-[var(--border-strong)]":
              variant === "outline",
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },
          className,
        )}
        {...props}
      >
        {isLoading ? "Loading…" : children}
      </button>
    );
  },
);
Button.displayName = "Button";
