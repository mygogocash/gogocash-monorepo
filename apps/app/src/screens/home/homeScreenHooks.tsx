import React from "react";

import { type ThemeColors } from "@mobile/theme/colorPalettes";
import { type ThemeSurfaces } from "@mobile/theme/themeSurfaces";

import { type HomeScreenStyles } from "./customerHomeStyles";

export type HomeScreenTheme = {
  readonly styles: HomeScreenStyles;
  readonly colors: ThemeColors;
  readonly surfaces: ThemeSurfaces;
};

const HomeScreenThemeContext = React.createContext<HomeScreenTheme | null>(null);

export function HomeScreenThemeProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: HomeScreenTheme;
}) {
  return (
    <HomeScreenThemeContext.Provider value={value}>{children}</HomeScreenThemeContext.Provider>
  );
}

export function useHomeScreenTheme(): HomeScreenTheme {
  const theme = React.useContext(HomeScreenThemeContext);
  if (!theme) {
    throw new Error("useHomeScreenTheme must be used within CustomerHomeScreen");
  }
  return theme;
}

export function useHomeScreenStyles(): HomeScreenStyles {
  return useHomeScreenTheme().styles;
}

export function useHomeScreenColors(): ThemeColors {
  return useHomeScreenTheme().colors;
}
