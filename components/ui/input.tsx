"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--foreground)]"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "ms-input h-11",
            error &&
              "border-[var(--danger)] focus:border-[var(--danger)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_25%,transparent)]",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[var(--danger)]">{error}</p>
        ) : null}
        {!error && hint ? (
          <p className="ms-text-muted text-xs">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
