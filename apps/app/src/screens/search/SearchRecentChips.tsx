import { ScrollView, Text, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { Clock3 as ClockIcon, Trash as TrashIcon, X as XIcon } from "@mobile/theme/icons";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { motion } from "@mobile/theme/motion";

import { createSearchScreenStyles } from "./createSearchScreenStyles";

type SearchRecentChipsProps = {
  readonly items: readonly string[];
  readonly onClear: () => void;
  readonly onRemove: (query: string) => void;
  readonly onSelect: (query: string) => void;
};

export function SearchRecentChips({ items, onClear, onRemove, onSelect }: SearchRecentChipsProps) {
  const styles = useThemedStyles(createSearchScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{tc("Recent searches")}</Text>
        <MotionPressable
          accessibilityLabel={tc("Clear recent searches")}
          accessibilityRole="button"
          onPress={onClear}
          pressScale={motion.scale.subtlePress}
          style={styles.clearHistoryButton}
        >
          <TrashIcon color={colors.muted} size={16} strokeWidth={2} />
          <Text style={styles.clearHistoryLabel}>{tc("Clear all")}</Text>
        </MotionPressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.recentScrollContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.recentRow}>
          {items.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.recentChip}>
              <ClockIcon color={colors.muted} size={14} strokeWidth={2} />
              <MotionPressable
                accessibilityLabel={item}
                accessibilityRole="button"
                onPress={() => onSelect(item)}
                pressScale={motion.scale.subtlePress}
                style={styles.recentChipSelect}
              >
                <Text numberOfLines={1} style={styles.recentChipText}>
                  {item}
                </Text>
              </MotionPressable>
              <MotionPressable
                accessibilityLabel={tc(`Remove ${item} from recent searches`)}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => onRemove(item)}
                pressScale={motion.scale.subtlePress}
                style={styles.recentChipRemove}
              >
                <XIcon color={colors.muted} size={14} strokeWidth={2} />
              </MotionPressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
