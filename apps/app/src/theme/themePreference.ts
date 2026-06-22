export type ThemePreference = "system" | "light" | "dark";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  if (value && (THEME_PREFERENCES as readonly string[]).includes(value)) {
    return value as ThemePreference;
  }
  return DEFAULT_THEME_PREFERENCE;
}
