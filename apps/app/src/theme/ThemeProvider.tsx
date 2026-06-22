import { StatusBar } from "expo-status-bar";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform, useColorScheme } from "react-native";

import { getColorsForTheme, type ThemeColors } from "@mobile/theme/colorPalettes";
import { resolveTheme, type ResolvedTheme } from "@mobile/theme/resolveTheme";
import {
  DEFAULT_THEME_PREFERENCE,
  type ThemePreference,
} from "@mobile/theme/themePreference";
import {
  readStoredThemePreference,
  readStoredThemePreferenceSync,
  writeStoredThemePreference,
} from "@mobile/theme/themePreferenceStorage";

type ThemeContextValue = {
  readonly preference: ThemePreference;
  readonly resolved: ResolvedTheme;
  readonly colors: ThemeColors;
  readonly ready: boolean;
  readonly setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveInitialPreference(): ThemePreference | null {
  if (Platform.OS === "web") {
    return readStoredThemePreferenceSync() ?? DEFAULT_THEME_PREFERENCE;
  }
  return null;
}

function applyWebColorScheme(resolved: ResolvedTheme) {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }
  document.documentElement.style.colorScheme = resolved;
  document.documentElement.dataset.theme = resolved;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => resolveInitialPreference() ?? DEFAULT_THEME_PREFERENCE
  );

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    let active = true;
    void (async () => {
      const stored = await readStoredThemePreference();
      if (active && stored !== null) {
        setPreferenceState(stored);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const resolved = useMemo(
    () => resolveTheme(preference, systemScheme),
    [preference, systemScheme]
  );
  const colors = useMemo(() => getColorsForTheme(resolved), [resolved]);

  useEffect(() => {
    applyWebColorScheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void writeStoredThemePreference(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      colors,
      ready: true,
      setPreference,
    }),
    [preference, resolved, colors, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}

type ThemePreferenceOverrideProps = PropsWithChildren<{
  preference: ThemePreference;
}>;

/** Force a subtree to resolve as light/dark/system without changing the stored preference. */
export function ThemePreferenceOverride({
  preference,
  children,
}: ThemePreferenceOverrideProps) {
  const parent = useTheme();
  const systemScheme = useColorScheme();
  const resolved = useMemo(
    () => resolveTheme(preference, systemScheme),
    [preference, systemScheme]
  );
  const overrideColors = useMemo(() => getColorsForTheme(resolved), [resolved]);
  const value = useMemo<ThemeContextValue>(
    () => ({
      ...parent,
      preference,
      resolved,
      colors: overrideColors,
    }),
    [parent, preference, resolved, overrideColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemedStatusBar() {
  const { resolved } = useTheme();
  return <StatusBar style={resolved === "dark" ? "light" : "dark"} />;
}
