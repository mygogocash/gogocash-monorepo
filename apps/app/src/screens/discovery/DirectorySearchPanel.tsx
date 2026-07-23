import { Text, TextInput, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { Search as SearchIcon } from "@mobile/theme/icons";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { webSearchInputFocusReset } from "./directoryAssets";

export type DirectorySortPill = {
  readonly label: string;
  readonly value: string;
};

/**
 * The search + "Sort by" + result-count block shared by every browse stage
 * (/brand, /shops, /category/*). One component so the same section cannot drift
 * page to page — the category stages previously had a hand-rolled copy with the
 * sort label inline instead of above the pills.
 *
 * `extraRows` is for stages with additional filters above the sort row (the shop
 * directory's shop-type pills).
 */
export function DirectorySearchPanel({
  activeSort,
  extraRows,
  onSearchChange,
  onSelectSort,
  resultsLabel,
  searchLabel,
  searchPlaceholder,
  searchValue,
  sortLabel,
  sortPills,
}: {
  activeSort: string;
  extraRows?: React.ReactNode;
  onSearchChange: (value: string) => void;
  onSelectSort: (value: string) => void;
  resultsLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  sortLabel: string;
  sortPills: readonly DirectorySortPill[];
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();

  return (
    <View style={styles.shopDirectoryFilterPanel}>
      <View style={styles.shopDirectorySearchBox}>
        <SearchIcon color={colors.muted} size={18} strokeWidth={typography.iconStrokeWidth} />
        <TextInput
          accessibilityLabel={searchLabel}
          autoCapitalize="none"
          autoCorrect={false}
          inputMode="search"
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={[styles.shopDirectorySearchInput, webSearchInputFocusReset]}
          value={searchValue}
        />
      </View>

      {extraRows}

      <View style={styles.shopDirectorySortBlock}>
        <Text numberOfLines={1} style={styles.shopDirectorySortLabel}>
          {tc(sortLabel)}
        </Text>
        <View style={styles.shopDirectorySortRow}>
          {sortPills.map((pill) => (
            <MotionPressable
              accessibilityRole="button"
              key={pill.value}
              onPress={() => onSelectSort(pill.value)}
              pressScale={motion.scale.subtlePress}
              style={[
                styles.shopDirectoryPill,
                activeSort === pill.value ? styles.shopDirectoryPillActive : null,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.directorySortPillText,
                  activeSort === pill.value ? styles.directorySortPillTextActive : null,
                ]}
              >
                {tc(pill.label)}
              </Text>
            </MotionPressable>
          ))}
          <Text style={styles.shopDirectoryResultsCount}>{resultsLabel}</Text>
        </View>
      </View>
    </View>
  );
}
