"use client";

import type React from "react";
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  /** True when the user has chosen light or dark explicitly (stored in localStorage). */
  hasExplicitPreference: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readInitialTheme(): { theme: Theme; explicit: boolean } {
  if (typeof window === "undefined") {
    return { theme: "light", explicit: false };
  }
  const saved = localStorage.getItem("theme");
  const explicit = saved === "light" || saved === "dark";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme: Theme = explicit ? (saved as Theme) : systemDark ? "dark" : "light";
  return { theme, explicit };
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [{ theme, hasExplicitPreference }, setState] = useState<{
    theme: Theme;
    hasExplicitPreference: boolean;
  }>(() => ({
    theme: "light",
    hasExplicitPreference: false,
  }));
  const [isInitialized, setIsInitialized] = useState(false);

  // Hydrate from localStorage + system preference (matches inline script in root layout).
  useEffect(() => {
    const { theme: initial, explicit } = readInitialTheme();
    startTransition(() => {
      setState({ theme: initial, hasExplicitPreference: explicit });
      setIsInitialized(true);
    });
  }, []);

  // Apply class + color-scheme on <html> (do not write localStorage here — avoids persisting OS-driven changes).
  useEffect(() => {
    if (!isInitialized) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, [theme, isInitialized]);

  // When the user has not chosen a fixed theme, follow OS light/dark changes.
  useEffect(() => {
    if (!isInitialized || hasExplicitPreference) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setState((s) => ({
        ...s,
        theme: mq.matches ? "dark" : "light",
      }));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [isInitialized, hasExplicitPreference]);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme,
        },
      }),
    [theme],
  );

  const toggleTheme = useCallback(() => {
    setState((prev) => {
      const next: Theme = prev.theme === "light" ? "dark" : "light";
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* private mode / quota */
      }
      return { theme: next, hasExplicitPreference: true };
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      hasExplicitPreference,
      toggleTheme,
    }),
    [theme, hasExplicitPreference, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
