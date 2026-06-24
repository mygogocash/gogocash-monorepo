import { Link, usePathname } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";

import menuFireImage from "../../assets/nav/menu-fire.png";
import questHeaderImage from "../../assets/nav/quest-header.png";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { CustomerDesktopBrandLink } from "@mobile/components/CustomerDesktopBrandLink";
import { CustomerLocaleRegionControl } from "@mobile/components/CustomerLocaleRegionControl";
import { CustomerSignInNavGraphic } from "@mobile/components/CustomerSignInNavGraphic";
import { CustomerProfileNav } from "@mobile/components/CustomerProfileNav";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import {
  getDesktopShellHorizontalPadding,
  mobileShellLayout,
  webDesktopHeaderNavItems,
  webHomeSearchPlaceholder,
} from "@mobile/design/webDesignParity";
import {
  AirplaneTilt,
  DeviceMobile,
  Heartbeat,
  Search,
  SquaresFour,
  Storefront,
  Tag,
  type IconComponent,
} from "@mobile/theme/icons";
import { motion } from "@mobile/theme/motion";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { getThemeSurfaces, type ThemeSurfaces } from "@mobile/theme/themeSurfaces";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { radii, spacing, typography } from "@mobile/theme/tokens";

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

// react-native-web renders a persistent CSS focus outline on Pressable/anchor elements after a
// MOUSE click (it does not gate the ring behind :focus-visible like the web reference). Suppressing
// the outline on these nav pressables removes the unwanted highlight box on the logo and nav tabs
// while keeping accessibilityRole/Label intact for assistive tech.
const webPressableFocusReset = {
  outlineStyle: "none",
  outlineWidth: 0,
} as unknown as ViewStyle;

// The web SubHeader marks a tab active by matching the current route, not a hardcoded flag.
function isDesktopNavItemActive(pathname: string, href: string): boolean {
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  const normalize = (value: string) => {
    const base = decode(value).split("?")[0].split("#")[0].replace(/\/+$/, "");
    return base === "" ? "/" : base;
  };
  const current = normalize(pathname);
  const target = normalize(href);
  if (target === "/") {
    return current === "/";
  }
  return current === target;
}

function useDesktopHeaderStyles() {
  const { colors, resolved } = useTheme();
  return useMemo(
    () => createDesktopHeaderStyles(colors, getThemeSurfaces(colors, resolved)),
    [colors, resolved]
  );
}

export function CustomerDesktopHeader({ viewportWidth }: { viewportWidth: number }) {
  const shellPadding = getDesktopShellHorizontalPadding(viewportWidth);
  const shellContentWidth = Math.min(viewportWidth, mobileShellLayout.desktopContentMaxWidth);
  const [localePanelOpen, setLocalePanelOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const tc = useCopy();
  const session = useMobileSessionSnapshot();
  const { colors } = useTheme();
  const styles = useDesktopHeaderStyles();

  return (
    <View style={[styles.desktopShell, { width: viewportWidth }]}>
      <View
        style={[
          styles.desktopHeader,
          localePanelOpen || profilePanelOpen ? styles.desktopHeaderOverlayLayer : null,
        ]}
      >
        <View
          style={[
            styles.desktopHeaderContent,
            { paddingHorizontal: shellPadding, width: shellContentWidth },
          ]}
        >
          <CustomerDesktopBrandLink />
          <View style={styles.desktopHeaderSearch}>
            <Search
              color={colors.primaryDark}
              size={20}
              strokeWidth={typography.iconStrokeWidth}
            />
            <TextInput
              accessibilityLabel={tc(webHomeSearchPlaceholder)}
              nativeID="desktop-header-search-input"
              placeholder={tc(webHomeSearchPlaceholder)}
              placeholderTextColor={colors.muted}
              style={StyleSheet.flatten([styles.desktopHeaderSearchInput, webPressableFocusReset])}
            />
          </View>
          <View style={styles.desktopHeaderActions}>
            <Link asChild href="/quest">
              <MotionPressable
                accessibilityLabel={tc("Quest")}
                pressScale={motion.scale.subtlePress}
                style={StyleSheet.flatten([styles.desktopQuestPill, webPressableFocusReset])}
              >
                <Image
                  alt="Quest"
                  accessibilityLabel={tc("Quest")}
                  resizeMode="cover"
                  source={questHeaderImage}
                  style={styles.desktopQuestImage}
                />
              </MotionPressable>
            </Link>
            {session ? (
              <CustomerProfileNav onExpandedChange={setProfilePanelOpen} session={session} />
            ) : (
              <Link asChild href="/login">
                <MotionPressable
                  accessibilityLabel={tc("Sign in")}
                  pressScale={motion.scale.subtlePress}
                  style={StyleSheet.flatten([styles.desktopSignIn, webPressableFocusReset])}
                >
                  <CustomerSignInNavGraphic />
                </MotionPressable>
              </Link>
            )}
            <CustomerLocaleRegionControl onExpandedChange={setLocalePanelOpen} />
          </View>
        </View>
      </View>
      <DesktopCategoryNav shellContentWidth={shellContentWidth} shellPadding={shellPadding} />
    </View>
  );
}

// Web SubHeader fades the underline in on hover for inactive tabs (group-hover:opacity-40).
const webSubNavHoverUnderlineOpacity = 0.4;

function DesktopCategoryTab({
  active,
  item,
}: {
  active: boolean;
  item: (typeof webDesktopHeaderNavItems)[number];
}) {
  const [hovered, setHovered] = useState(false);
  const tc = useCopy();
  const styles = useDesktopHeaderStyles();
  const underlineOpacity = active ? 1 : hovered ? webSubNavHoverUnderlineOpacity : 0;

  return (
  <Link asChild href={item.href as never} key={item.id}>
                <MotionPressable
                  hoverLift={false}
                  onHoverIn={() => setHovered(true)}
                  onHoverOut={() => setHovered(false)}
                  pressScale={motion.scale.subtlePress}
                  style={StyleSheet.flatten([
                    styles.desktopCategoryNavItem,
                    "menuTypography" in item && item.menuTypography === "lead"
                      ? styles.desktopCategoryNavItemLead
                      : null,
                    webPressableFocusReset,
                  ])}
                >
                  <DesktopCategoryNavIcon name={item.icon} active={active} />
                  <Text
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={[
                      styles.desktopCategoryNavText,
                      "menuTypography" in item && item.menuTypography === "lead"
                        ? styles.desktopCategoryNavTextLead
                        : null,
                    ]}
                  >
                    {tc(item.label)}
                  </Text>
                  {"showFire" in item && item.showFire ? (
                    <Image
                      alt=""
                      resizeMode="cover"
                      source={menuFireImage}
                      style={styles.desktopCategoryFire}
                    />
                  ) : null}
                  <View style={[styles.desktopCategoryUnderline, { opacity: underlineOpacity }]} />
                </MotionPressable>
              </Link>
  );
}

function DesktopCategoryNav({
  shellContentWidth,
  shellPadding,
}: {
  shellContentWidth: number;
  shellPadding: number;
}) {
  const pathname = usePathname();
  const styles = useDesktopHeaderStyles();
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
            <DesktopCategoryTab
              active={isDesktopNavItemActive(pathname, item.href)}
              item={item}
              key={item.id}
            />
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
  const { colors } = useTheme();
  const styles = useDesktopHeaderStyles();

  if (name === "none") {
    return null;
  }

  const IconComponent = desktopNavIcons[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      color={active ? colors.primaryDark : colors.ink}
      size={16}
      style={styles.desktopCategoryNavIcon}
      weight="regular"
    />
  );
}

function createDesktopHeaderStyles(colors: ThemeColors, surfaces: ThemeSurfaces) {
  return StyleSheet.create({
    desktopShell: {
      backgroundColor: colors.card,
      boxShadow: surfaces.desktopShellShadow,
      zIndex: 20,
    },
    desktopHeader: {
      alignItems: "center",
      backgroundColor: colors.card,
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
  desktopHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  desktopHeaderSearch: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 560,
    minHeight: 44,
    minWidth: 0,
    // Clip to the radius so the rounded corners don't rasterize "horns" under the focus layer.
    overflow: "hidden",
    paddingHorizontal: spacing.md,
  },
  desktopHeaderSearchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 15,
    minWidth: 0,
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
      backgroundColor: surfaces.localeButtonBackground,
      borderColor: surfaces.localeButtonBorder,
    borderRadius: radii.chip,
    borderWidth: 1,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
    desktopLocaleButtonOpen: {
      backgroundColor: surfaces.localeButtonOpenBackground,
      borderColor: surfaces.localeButtonOpenBorder,
    },
  desktopLocaleRoot: {
    position: "relative",
    zIndex: 90,
  },
    desktopLocalePopover: {
      backgroundColor: colors.card,
      borderColor: colors.border,
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
      color: colors.muted,
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
      backgroundColor: colors.primarySoft,
    },
  desktopLocaleOptionFlag: {
    fontSize: 18,
    lineHeight: 20,
  },
    desktopLocaleOptionLabel: {
      color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
    desktopLocaleOptionLabelSelected: {
      color: colors.primary,
    },
    desktopLocaleDivider: {
      backgroundColor: colors.border,
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
      backgroundColor: colors.card,
    // No fixed height: the bar fits its content (the nav items, which already carry
    // their own vertical padding) instead of the taller desktopSubNavHeight.
    justifyContent: "center",
    width: "100%",
  },
  desktopCategoryNavInner: {
    alignItems: "center",
    alignSelf: "center",
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
    fontWeight: typography.bodyWeight,
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
      backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    bottom: 0,
    height: 2,
    left: 16,
    position: "absolute",
    right: 16,
    },
  });
}
