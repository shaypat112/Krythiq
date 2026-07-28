"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "krythiq-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(nextTheme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", nextTheme === "dark");
  root.style.colorScheme = nextTheme;
}

function getStoredTheme(defaultTheme: Theme) {
  if (typeof window === "undefined") {
    return defaultTheme;
  }
  const storedTheme = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  return storedTheme === "dark" || storedTheme === "light"
    ? storedTheme
    : defaultTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() =>
    getStoredTheme(defaultTheme),
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (nextTheme) => {
        setThemeState(nextTheme);
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
      },
      toggleTheme: () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setThemeState(nextTheme);
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
      },
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}
