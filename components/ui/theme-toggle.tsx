"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/lib/store/theme-store";
import { cn } from "@/lib/utils/cn";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "icon";
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  size = "icon",
  showLabel = false,
}: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === "icon" ? "icon" : size}
      onClick={toggleTheme}
      className={cn(className)}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {showLabel ? (
        <span className="text-sm">{isDark ? "Light" : "Dark"}</span>
      ) : null}
    </Button>
  );
}
