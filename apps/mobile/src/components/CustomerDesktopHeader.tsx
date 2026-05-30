import { Link } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import logoMarkImage from "../../assets/nav/logo.png";
import menuFireImage from "../../assets/nav/menu-fire.png";
import questHeaderImage from "../../assets/nav/quest-header.png";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { CustomerLocaleRegionControl } from "@mobile/components/CustomerLocaleRegionControl";
import { CustomerSignInNavGraphic } from "@mobile/components/CustomerSignInNavGraphic";
import {
  getDesktopShellHorizontalPadding,
  mobileShellLayout,
  webDesktopHeaderNavItems,
} from "@mobile/design/webDesignParity";
import {
  AirplaneTilt,
  DeviceMobile,
  Heartbeat,
  SquaresFour,
  Storefront,
  Tag,
  type IconComponent,
} from "@mobile/theme/icons";
import { motion } from "@mobile/theme/motion";
import { colors, radii, spacing, typography } from "@mobile/theme/tokens";

const desktopNavIcons: Partial<
  Record<(typeof webDesktopHeaderNavItems)[number]["icon"], IconComponent>
> = {
  electronics: DeviceMobile,
  health: Heartbeat,
  promotion: Tag,
  shop: Storefront,
  shops: SquaresFour,
  travel: AirplaneTilt,
};

export function CustomerDesktopHeader({ viewportWidth }: { viewportWidth: number }) {
  const shellPadding = getDesktopShellHorizontalPadding(viewportWidth);
  const shellContentWidth = Math.min(viewportWidth, mobileShellLayout.desktopContentMaxWidth);
  const [localePanelOpen, setLocalePanelOpen] = useState(false);

  return (
    <View style={[styles.desktopShell, { width: viewportWidth }]}>
      <View
        style={[
          styles.desktopHeader,
          localePanelOpen ? styles.desktopHeaderOverlayLayer : null,
        ]}
      >
        <View
          style={[
            styles.desktopHeaderContent,
            { paddingHorizontal: shellPadding, width: shellContentWidth },
          ]}
        >
          <Link asChild href="/">
            <MotionPressable pressScale={motion.scale.subtlePress} style={styles.desktopLogoLink}>
              <Image
                alt="GoGoCash logo"
                accessibilityLabel="GoGoCash logo"
                source={logoMarkImage}
                style={styles.desktopLogoMark}
              />
              <Text style={styles.desktopLogoText}>GoGoCash</Text>
            </MotionPressable>
          </Link>
          <View style={styles.desktopHeaderActions}>
            <Link asChild href="/quest">
              <MotionPressable
                accessibilityLabel="Quest"
                pressScale={motion.scale.subtlePress}
                style={styles.desktopQuestPill}
              >
                <Image
                  alt="Quest"
                  accessibilityLabel="Quest"
                  resizeMode="cover"
                  source={questHeaderImage}
                  style={styles.desktopQuestImage}
                />
              </MotionPressable>
            </Link>
            <Link asChild href="/login">
              <MotionPressable
                accessibilityLabel="Sign in"
                pressScale={motion.scale.subtlePress}
                style={styles.desktopSignIn}
              >
                <CustomerSignInNavGraphic />
              </MotionPressable>
            </Link>
            <CustomerLocaleRegionControl onExpandedChange={setLocalePanelOpen} />
          </View>
        </View>
      </View>
      <DesktopCategoryNav shellContentWidth={shellContentWidth} shellPadding={shellPadding} />
    </View>
  );
}

function DesktopCategoryNav({
  shellContentWidth,
  shellPadding,
}: {
  shellContentWidth: number;
  shellPadding: number;
}) {
  return (
    <View accessibilityLabel="Category navigation" style={styles.desktopCategoryNav}>
      <View
        style={[
          styles.desktopCategoryNavInner,
          { paddingHorizontal: shellPadding, width: shellContentWidth },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.desktopCategoryNavList}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.desktopCategoryNavScroller}
        >
          {webDesktopHeaderNavItems.map((item) => (
            <Link asChild href={item.href as never} key={item.id}>
              <MotionPressable
                pressScale={motion.scale.subtlePress}
                style={StyleSheet.flatten([
                  styles.desktopCategoryNavItem,
                  "menuTypography" in item && item.menuTypography === "lead"
                    ? styles.desktopCategoryNavItemLead
                    : null,
                ])}
              >
                <DesktopCategoryNavIcon name={item.icon} active={Boolean(item.active)} />
                <Text
                  style={[
                    styles.desktopCategoryNavText,
                    "menuTypography" in item && item.menuTypography === "lead"
                      ? styles.desktopCategoryNavTextLead
                      : null,
                  ]}
                >
                  {item.label}
                </Text>
                {"showFire" in item && item.showFire ? (
                  <Image
                    alt=""
                    resizeMode="cover"
                    source={menuFireImage}
                    style={styles.desktopCategoryFire}
                  />
                ) : null}
                {item.active ? <View style={styles.desktopCategoryUnderline} /> : null}
              </MotionPressable>
            </Link>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function DesktopCategoryNavIcon({
  active,
  name,
}: {
  active: boolean;
  name: (typeof webDesktopHeaderNavItems)[number]["icon"];
}) {
  if (name === "none") {
    return null;
  }

  const IconComponent = desktopNavIcons[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      color={active ? "#00B14F" : "#3B3B3B"}
      size={16}
      style={styles.desktopCategoryNavIcon}
      weight="regular"
    />
  );
}

const styles = StyleSheet.create({
  desktopShell: {
    backgroundColor: colors.white,
    boxShadow: "0 1px 0 rgba(229, 231, 235, 0.75)",
    zIndex: 20,
  },
  desktopHeader: {
    alignItems: "center",
    backgroundColor: colors.white,
    height: mobileShellLayout.desktopHeaderHeight,
    justifyContent: "center",
    width: "100%",
  },
  desktopHeaderOverlayLayer: {
    position: "relative",
    zIndex: 120,
  },
  desktopHeaderContent: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 20,
    height: mobileShellLayout.desktopHeaderHeight,
    justifyContent: "space-between",
  },
  desktopLogoLink: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
  },
  desktopLogoMark: {
    borderRadius: 16,
    height: 56,
    width: 56,
  },
  desktopLogoText: {
    color: "#1F2937",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 28,
  },
  desktopHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  desktopQuestPill: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 169,
  },
  desktopQuestImage: {
    height: 48,
    width: 169,
  },
  desktopSignIn: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 160,
  },
  desktopLocaleButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#E5E7EB",
    borderRadius: radii.chip,
    borderWidth: 1,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  desktopLocaleButtonOpen: {
    backgroundColor: "#E8FAF5",
    borderColor: "rgba(0, 204, 153, 0.4)",
  },
  desktopLocaleRoot: {
    position: "relative",
    zIndex: 90,
  },
  desktopLocalePopover: {
    backgroundColor: colors.white,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
    padding: 16,
    position: "absolute",
    right: 0,
    top: 52,
    width: 288,
    zIndex: 100,
  },
  desktopLocaleSectionTitle: {
    color: "#9CA3AF",
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  desktopLocaleOptionStack: {
    gap: 2,
    marginTop: 8,
  },
  desktopLocaleOption: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  desktopLocaleOptionSelected: {
    backgroundColor: "#E8FAF5",
  },
  desktopLocaleOptionFlag: {
    fontSize: 18,
    lineHeight: 20,
  },
  desktopLocaleOptionLabel: {
    color: "#374151",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  desktopLocaleOptionLabelSelected: {
    color: "#00CC99",
  },
  desktopLocaleDivider: {
    backgroundColor: "#F3F4F6",
    height: 1,
    marginBottom: 16,
    marginTop: 16,
  },
  desktopLocaleRegionScroller: {
    height: 192,
    marginTop: 8,
    overflow: "hidden",
  },
  desktopLocaleRegionList: {
    gap: 2,
    paddingRight: 4,
  },
  desktopCategoryNav: {
    alignItems: "center",
    backgroundColor: colors.white,
    height: mobileShellLayout.desktopSubNavHeight,
    justifyContent: "center",
    width: "100%",
  },
  desktopCategoryNavInner: {
    alignItems: "center",
    alignSelf: "center",
    height: mobileShellLayout.desktopSubNavHeight,
    justifyContent: "center",
  },
  desktopCategoryNavScroller: {
    flexGrow: 0,
    height: 38,
  },
  desktopCategoryNavList: {
    alignItems: "flex-end",
    gap: 16,
    justifyContent: "center",
    minHeight: 38,
    transform: [{ translateX: -1.6 }],
  },
  desktopCategoryNavItem: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: 8,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: "relative",
  },
  desktopCategoryNavItemLead: {
    height: 40,
  },
  desktopCategoryNavIcon: {
    height: 16,
    width: 16,
  },
  desktopCategoryNavText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
  },
  desktopCategoryNavTextLead: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  desktopCategoryFire: {
    height: 16,
    width: 13,
  },
  desktopCategoryUnderline: {
    backgroundColor: "#00B14F",
    borderRadius: radii.chip,
    bottom: 0,
    height: 2,
    left: 16,
    position: "absolute",
    right: 16,
  },
});
