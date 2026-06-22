import type { ColorSchemeName } from "react-native";

import type { ThemePreference } from "@mobile/theme/themePreference";

export type ResolvedTheme = "light" | "dark";

export function resolveTheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName | null | undefined
): ResolvedTheme {
  if (preference === "light") {
    return "light";
  }
  if (preference === "dark") {
    return "dark";
  }
  if (systemScheme === "dark") {
    return "dark";
  }
  return "light";
}
