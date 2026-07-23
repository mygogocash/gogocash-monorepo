import { useState } from "react";
import { Text, View } from "react-native";
import { Globe as GlobeIcon, Search as SearchIcon } from "@mobile/theme/icons";
import { CustomerLocaleRegionSheet } from "@mobile/components/CustomerLocaleRegionSheet";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { resolveGoLinkMode } from "@mobile/config/featureFlags";
import { webLocaleRegionPanel } from "@mobile/design/webDesignParity";
import { useRegion } from "@mobile/i18n/LocaleProvider";
import { useCopy } from "@mobile/i18n/useCopy";
import { pickThemed } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { motion } from "@mobile/theme/motion";
import { DetectedRegionBanner } from "./DetectedRegionBanner";
import { homeIconStrokeWidth, mobileTabletHeaderGradient } from "./homeAssets";
import { useHomeScreenStyles } from "./homeScreenHooks";
import { MobileTabletGoLinkBannerCollapse } from "./MobileTabletGoLinkBannerCollapse";
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
  const { colors } = useTheme();
  const tc = useCopy();
  const { region } = useRegion();
  const [regionSheetOpen, setRegionSheetOpen] = useState(false);
  const isTabletFrame = homeLayout.contentWidth === 768;
  const horizontalPadding = isTabletFrame ? homeLayout.contentHorizontalPadding : 16;
  const headerActionIconSize = isTabletFrame ? 24 : 20;
  const regionFlag =
    webLocaleRegionPanel.regions.find((option) => option.code === region)?.flag ?? "";
  const headerIconColor = pickThemed(colors, "#303846", "rgba(255, 255, 255, 0.92)");
  // GoLink 3-state: render the paste box unless HIDDEN; coming-soon shows it disabled.
  const goLinkMode = resolveGoLinkMode();

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
          <Text style={styles.mobileTabletHeaderSubcopy}>{tc("Earn cashback with GoGoLink")}</Text>
        </View>
        <View style={styles.mobileTabletHeaderActions}>
          <MotionPressable
            accessibilityLabel={tc("Language and region")}
            accessibilityRole="button"
            onPress={() => setRegionSheetOpen(true)}
            pressScale={motion.scale.subtlePress}
            style={[
              styles.mobileTabletHeaderIconButton,
              !isTabletFrame ? styles.mobileHeaderIconButtonSmall : null,
            ]}
          >
            <GlobeIcon color={headerIconColor} size={headerActionIconSize} weight="regular" />
            {regionFlag ? (
              <Text style={styles.mobileHeaderRegionFlagBadge}>{regionFlag}</Text>
            ) : null}
          </MotionPressable>
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
            <SearchIcon
              color={headerIconColor}
              size={headerActionIconSize}
              strokeWidth={homeIconStrokeWidth}
            />
          </MotionPressable>
        </View>
      </View>

      <DetectedRegionBanner onChangePress={() => setRegionSheetOpen(true)} />

      {goLinkMode !== "hidden" ? (
        <MobileTabletGoLinkBannerCollapse
          comingSoon={goLinkMode === "comingSoon"}
          isCovered={isGoLinkCovered}
          onOpenGuideline={onOpenGoLinkGuideline}
          onResultHref={onGoLinkResultHref}
        />
      ) : null}

      {regionSheetOpen ? (
        <CustomerLocaleRegionSheet onClose={() => setRegionSheetOpen(false)} />
      ) : null}
    </View>
  );
}
