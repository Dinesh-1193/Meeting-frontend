import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        applyThemeClass(next);
        set({ theme: next });
      },
    }),
    {
      name: "meetspace-theme",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyThemeClass(state.theme);
      },
    },
  ),
);

export function applyThemeClass(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const raw = localStorage.getItem("meetspace-theme");
    if (!raw) return "light";
    const parsed = JSON.parse(raw) as { state?: { theme?: ThemeMode } };
    return parsed.state?.theme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
