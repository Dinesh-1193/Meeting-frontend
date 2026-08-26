"use client";

import { useEffect, type ReactNode } from "react";
import { applyThemeClass, useThemeStore } from "@/lib/store/theme-store";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  useEffect(() => {
    // Ensure rehydrate applies without waiting for full mount quirks
    const unsub = useThemeStore.persist.onFinishHydration((state) => {
      applyThemeClass(state.theme);
    });
    if (useThemeStore.persist.hasHydrated()) {
      applyThemeClass(useThemeStore.getState().theme);
    }
    return unsub;
  }, []);

  return children;
}
