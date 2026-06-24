import { Text, View } from "react-native";
import { ChevronDown as ChevronDownIcon, Search as SearchIcon } from "@mobile/theme/icons";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { BrowseShortcuts } from "./BrowseShortcuts";
import { DesktopGoLinkBanner } from "./DesktopGoLinkBanner";
import { homeIconStrokeWidth, mobileTabletHeaderGradient } from "./homeAssets";
import { useHomeScreenStyles } from "./homeScreenHooks";
import { type MobileTabletHomeHeaderProps } from "./homeTypes";

export function MobileTabletHomeHeader({
  greetingName,
  homeLayout,
  isGoLinkCovered,
  onGoLinkResultHref,
  onOpenGoLinkGuideline,
  onOpenSearchPopover,
}: MobileTabletHomeHeaderProps) {
  const styles = useHomeScreenStyles();
  const tc = useCopy();
  const isTabletFrame = homeLayout.contentWidth === 768;
  const horizontalPadding = isTabletFrame ? homeLayout.contentHorizontalPadding : 16;
  const headerActionIconSize = isTabletFrame ? 24 : 20;

  return (
    <View
      style={[
        styles.mobileTabletHomeHeader,
        mobileTabletHeaderGradient,
        isTabletFrame ? styles.mobileTabletHomeHeaderTablet : null,
        { paddingHorizontal: horizontalPadding },
      ]}
    >
      <View style={styles.mobileTabletHeaderTopRow}>
        <View style={styles.mobileTabletHeaderCopy}>
          <Text style={styles.mobileTabletHeaderGreeting}>
            {greetingName ? `Hi ${greetingName}!` : tc("Hi!")}
          </Text>
          <Text style={styles.mobileTabletHeaderSubcopy}>{tc("Earn cashback with GoLink")}</Text>
        </View>
        <View style={styles.mobileTabletHeaderActions}>
          <MotionPressable
            accessibilityLabel={tc("Search")}
            accessibilityRole="button"
            onPress={onOpenSearchPopover}
            pressScale={motion.scale.subtlePress}
            style={[
              styles.mobileTabletHeaderIconButton,
              !isTabletFrame ? styles.mobileHeaderIconButtonSmall : null,
            ]}
          >
            <SearchIcon color="#303846" size={headerActionIconSize} strokeWidth={homeIconStrokeWidth} />
          </MotionPressable>
        </View>
      </View>

      {isGoLinkCovered ? null : (
        <DesktopGoLinkBanner
          onOpenGuideline={onOpenGoLinkGuideline}
          onResultHref={onGoLinkResultHref}
          variant="mobileTabletHeader"
        />
      )}

      <View style={styles.mobileTabletHeaderShortcutDock}>
        <BrowseShortcuts />
      </View>
    </View>
  );
}
