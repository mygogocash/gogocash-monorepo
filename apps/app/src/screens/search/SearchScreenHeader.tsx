import { TextInput, View } from "react-native";
import { useState } from "react";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { webHomeSearchPlaceholder } from "@mobile/design/webDesignParity";
import { ChevronLeft as ChevronLeftIcon, Search as SearchIcon } from "@mobile/theme/icons";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { motion } from "@mobile/theme/motion";

import { createSearchScreenStyles } from "./createSearchScreenStyles";
import { webSearchInputFocusReset } from "../home/homeAssets";

const MOBILE_SEARCH_PLACEHOLDER = "Search brands";

type SearchScreenHeaderProps = {
  readonly query: string;
  readonly onBack: () => void;
  readonly onChangeQuery: (value: string) => void;
  readonly onSubmit: () => void;
  readonly topInset: number;
};

export function SearchScreenHeader({
  query,
  onBack,
  onChangeQuery,
  onSubmit,
  topInset,
}: SearchScreenHeaderProps) {
  const styles = useThemedStyles(createSearchScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const [focused, setFocused] = useState(true);

  return (
    <View style={[styles.header, { paddingTop: Math.max(topInset, 8) }]}>
      <MotionPressable
        accessibilityLabel={tc("Back")}
        accessibilityRole="button"
        onPress={onBack}
        pressScale={motion.scale.subtlePress}
        style={styles.backButton}
      >
        <ChevronLeftIcon color={colors.ink} size={22} strokeWidth={2} />
      </MotionPressable>
      <View style={[styles.searchFieldShell, focused ? styles.searchFieldShellFocused : null]}>
        <SearchIcon color={colors.primaryDark} size={18} strokeWidth={2} />
        <TextInput
          accessibilityLabel={tc(webHomeSearchPlaceholder)}
          autoFocus
          nativeID="mobile-search-input"
          onBlur={() => setFocused(false)}
          onChangeText={onChangeQuery}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmit}
          placeholder={tc(MOBILE_SEARCH_PLACEHOLDER)}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={[styles.searchInput, webSearchInputFocusReset]}
          testID="mobile-search-input"
          value={query}
        />
      </View>
      <MotionPressable
        accessibilityLabel={tc("Search")}
        accessibilityRole="button"
        onPress={onSubmit}
        pressScale={motion.scale.subtlePress}
        style={styles.submitButton}
      >
        <SearchIcon color={colors.white} size={18} strokeWidth={2} />
      </MotionPressable>
    </View>
  );
}
