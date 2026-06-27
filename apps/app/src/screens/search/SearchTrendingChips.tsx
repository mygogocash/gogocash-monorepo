import { ScrollView, Text, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { motion } from "@mobile/theme/motion";

import { createSearchScreenStyles } from "./createSearchScreenStyles";

type SearchTrendingChipsProps = {
  readonly onSelect: (term: string) => void;
  readonly terms: readonly string[];
};

export function SearchTrendingChips({ onSelect, terms }: SearchTrendingChipsProps) {
  const styles = useThemedStyles(createSearchScreenStyles);
  const tc = useCopy();

  if (terms.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{tc("Trending searches")}</Text>
      <ScrollView
        contentContainerStyle={styles.trendingScrollContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.trendingRow}>
          {terms.map((term, index) => (
            <MotionPressable
              accessibilityLabel={term}
              accessibilityRole="button"
              key={`${term}-${index}`}
              onPress={() => onSelect(term)}
              pressScale={motion.scale.subtlePress}
              style={styles.trendingChip}
            >
              <Text numberOfLines={1} style={styles.trendingChipText}>
                {term}
              </Text>
            </MotionPressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
