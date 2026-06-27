import { Text, View } from "react-native";
import { useMemo } from "react";

import type { OfferSearchMatch } from "@mobile/account/useOfferSearch";
import { useCopy } from "@mobile/i18n/useCopy";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createHomeScreenStyles } from "../home/customerHomeStyles";
import { HomeSearchResultRow } from "../home/HomeSearchResultRow";
import { HomeScreenThemeProvider } from "../home/homeScreenHooks";
import { createSearchScreenStyles } from "./createSearchScreenStyles";

type SearchResultsSectionsProps = {
  readonly matches: readonly OfferSearchMatch[];
  readonly query: string;
  readonly status: "error" | "loading" | "ready";
};

function searchResultKey(item: OfferSearchMatch, index: number) {
  return item.id ?? `${item.brand}-${item.cashback}-${index}`;
}

export function SearchResultsSections({ matches, query, status }: SearchResultsSectionsProps) {
  const styles = useThemedStyles(createSearchScreenStyles);
  const { colors, resolved } = useTheme();
  const surfaces = getThemeSurfaces(colors, resolved);
  const homeStyles = useThemedStyles((palette) => createHomeScreenStyles(palette, surfaces));
  const homeTheme = useMemo(
    () => ({ styles: homeStyles, colors, surfaces }),
    [homeStyles, colors, surfaces]
  );
  const tc = useCopy();
  const trimmed = query.trim();

  if (!trimmed) {
    return null;
  }

  return (
    <View style={styles.resultsSection}>
      <Text style={styles.resultsHeading}>{tc(webHomeSearchPopularPanel.resultsTitle)}</Text>
      <Text style={styles.resultsSubheading}>{tc(webHomeSearchPopularPanel.resultsSubtitle)}</Text>
      {status === "loading" ? (
        <Text style={styles.resultsSubheading}>{tc("Searching brands and shops…")}</Text>
      ) : null}
      {status === "error" ? (
        <Text style={styles.noMatchCard}>
          {tc("Search is temporarily unavailable. Try again in a moment.")}
        </Text>
      ) : null}
      {status === "ready" && matches.length === 0 ? (
        <Text style={styles.noMatchCard}>{tc(webHomeSearchPopularPanel.noMatches)}</Text>
      ) : null}
      {matches.length > 0 ? (
        <HomeScreenThemeProvider value={homeTheme}>
          <View style={styles.resultList}>
            {matches.map((item, index) => (
              <HomeSearchResultRow item={item} key={searchResultKey(item, index)} variant="compact" />
            ))}
          </View>
        </HomeScreenThemeProvider>
      ) : null}
    </View>
  );
}
