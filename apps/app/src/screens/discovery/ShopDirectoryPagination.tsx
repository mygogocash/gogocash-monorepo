import { View, Text } from "react-native";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mobile/theme/icons";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";

export function ShopDirectoryPagination({
  activePage,
  onChangePage,
  totalPages,
}: {
  activePage: number;
  onChangePage: (page: number) => void;
  totalPages: number;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const pages = Array.from({ length: totalPages }).map((_, index) => index + 1);

  return (
    <View style={styles.shopDirectoryPagination}>
      <MotionPressable
        accessibilityLabel={tc("Previous page")}
        accessibilityRole="button"
        disabled={activePage <= 1}
        hitSlop={6}
        onPress={() => onChangePage(Math.max(1, activePage - 1))}
        pressScale={motion.scale.subtlePress}
        style={[
          styles.shopDirectoryPageButton,
          activePage <= 1 ? styles.shopDirectoryPageButtonDisabled : null,
        ]}
      >
        <ChevronLeftIcon
          color={activePage <= 1 ? colors.muted : colors.ink}
          size={16}
          strokeWidth={typography.iconStrokeWidth}
        />
      </MotionPressable>
      {pages.map((page) => (
        <MotionPressable
          accessibilityRole="button"
          hitSlop={6}
          key={page}
          onPress={() => onChangePage(page)}
          pressScale={motion.scale.subtlePress}
          style={[
            styles.shopDirectoryPageButton,
            activePage === page ? styles.shopDirectoryPageButtonActive : null,
          ]}
        >
          <Text
            style={[
              styles.shopDirectoryPageButtonText,
              activePage === page ? styles.shopDirectoryPageButtonTextActive : null,
            ]}
          >
            {page}
          </Text>
        </MotionPressable>
      ))}
      <MotionPressable
        accessibilityLabel={tc("Next page")}
        accessibilityRole="button"
        disabled={activePage >= totalPages}
        hitSlop={6}
        onPress={() => onChangePage(Math.min(totalPages, activePage + 1))}
        pressScale={motion.scale.subtlePress}
        style={[
          styles.shopDirectoryPageButton,
          activePage >= totalPages ? styles.shopDirectoryPageButtonDisabled : null,
        ]}
      >
        <ChevronRightIcon
          color={activePage >= totalPages ? colors.muted : colors.ink}
          size={16}
          strokeWidth={typography.iconStrokeWidth}
        />
      </MotionPressable>
    </View>
  );
}
