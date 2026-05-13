import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "calzatura_theme";

function getInitialTheme(): ThemeMode {
  if (typeof globalThis.window === "undefined") return "light";

  const stored = globalThis.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
}
