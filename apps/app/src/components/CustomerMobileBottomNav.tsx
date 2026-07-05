import { useRouter } from "expo-router";
import { type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CircleUserRound as ProfileIcon,
  Home as HomeIcon,
  Link2 as LinkIcon,
  Trophy as TrophyIcon,
  WalletCards as WalletIcon,
} from "@mobile/theme/icons";

import { ProfileAvatarImage } from "@mobile/components/ProfileAvatarImage";
import { buildProtectedLoginRedirect } from "@mobile/auth/routeGuard";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { mobileShellLayout, webMobileBottomNavItems } from "@mobile/design/webDesignParity";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { useCopy } from "@mobile/i18n/useCopy";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type BottomNavRouteId = "home" | "golink" | "wallet" | "quest" | "profile";
type BottomNavIconComponent = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

const bottomNavIcons: Record<string, BottomNavIconComponent> = {
  golink: LinkIcon,
  home: HomeIcon,
  profile: ProfileIcon,
  quest: TrophyIcon,
  wallet: WalletIcon,
};

const protectedBottomNavHrefs = new Set(["/profile", "/wallet"]);

export function CustomerMobileBottomNav({
  activeRouteId,
  bottomInset,
}: {
  activeRouteId?: BottomNavRouteId;
  bottomInset: number;
}) {
  const tc = useCopy();
  const router = useRouter();
  const session = useMobileSessionSnapshot();
  const { isAuthed, ready } = useAuthGuardSession();
  const { colors, resolved } = useTheme();
  const surfaces = getThemeSurfaces(colors, resolved);
  const styles = useThemedStyles(createBottomNavStyles);

  function handleBottomNavPress(href: string) {
    if (!ready) {
      return;
    }

    if (!isAuthed && protectedBottomNavHrefs.has(href)) {
      router.push((buildProtectedLoginRedirect(href) ?? "/login") as never);
      return;
    }

    router.push(href as never);
  }

  return (
    <View
      style={[
        styles.bottomNavWrap,
        {
          paddingBottom: Math.max(10, bottomInset + 8),
        },
      ]}
    >
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: surfaces.bottomNavBackground,
            borderColor: surfaces.bottomNavBorder,
          },
        ]}
      >
        {webMobileBottomNavItems.map((item) => {
          const active = getBottomNavRouteId(item.href) === activeRouteId;
          const emphasized = "emphasized" in item && item.emphasized;

          return (
            <Pressable
              accessibilityRole="button"
              key={item.label}
              onPress={() => handleBottomNavPress(item.href)}
              style={StyleSheet.flatten([
                styles.bottomNavItem,
                emphasized ? styles.bottomNavItemEmphasized : null,
                active ? styles.bottomNavItemActive : null,
              ])}
            >
                <View
                  style={[styles.bottomNavIcon, emphasized ? styles.bottomNavIconEmphasized : null]}
                >
                  <BottomNavIcon
                    active={active}
                    avatarUrl={
                      typeof session?.avatar_url === "string" && session.avatar_url.trim()
                        ? session.avatar_url.trim()
                        : null
                    }
                    emphasized={emphasized}
                    name={item.icon}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.bottomNavLabel,
                    emphasized ? styles.bottomNavLabelEmphasized : null,
                    active ? styles.bottomNavTextActive : null,
                  ]}
                >
                  {tc(item.label)}
                </Text>
              </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BottomNavIcon({
  active,
  avatarUrl,
  emphasized,
  name,
}: {
  active: boolean;
  avatarUrl?: string | null;
  emphasized: boolean;
  name: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createBottomNavStyles);
  const Icon = bottomNavIcons[name] ?? HomeIcon;
  const color = emphasized ? colors.white : active ? colors.primaryDark : colors.muted;

  if (name === "profile" && active) {
    return (
      <ProfileAvatarImage
        accessibilityLabel="Profile avatar"
        avatarUrl={avatarUrl}
        size={28}
        style={styles.bottomNavProfileAvatar}
      />
    );
  }

  return (
    <Icon color={color} size={emphasized ? 28 : 24} strokeWidth={typography.iconStrokeWidth} />
  );
}

function getBottomNavRouteId(href: string): BottomNavRouteId {
  if (href === "/") {
    return "home";
  }

  return href.replace("/", "") as BottomNavRouteId;
}

function createBottomNavStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bottomNavWrap: {
      bottom: 0,
      left: 0,
      marginHorizontal: "auto",
      maxWidth: mobileShellLayout.bottomNavMaxWidth,
      paddingHorizontal: spacing.md,
      position: "absolute",
      right: 0,
    },
    bottomNav: {
      alignItems: "center",
      borderRadius: 28,
      borderWidth: 1,
      boxShadow: shadows.bottomNavCss,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 86,
      paddingHorizontal: spacing.sm,
    },
    bottomNavItem: {
      alignItems: "center",
      borderRadius: radii.lg,
      flex: 1,
      gap: spacing.xs,
      justifyContent: "center",
      minHeight: 62,
    },
    bottomNavItemActive: {
      backgroundColor: colors.primarySoft,
    },
    bottomNavItemEmphasized: {
      marginTop: -32,
    },
    bottomNavIcon: {
      alignItems: "center",
      height: 28,
      justifyContent: "center",
      minWidth: 28,
    },
    bottomNavIconEmphasized: {
      backgroundColor: colors.primary,
      borderColor: colors.primarySoft,
      borderRadius: radii.chip,
      borderWidth: 8,
      height: 64,
      width: 64,
    },
    bottomNavProfileAvatar: {
      borderRadius: radii.chip,
      height: 28,
      width: 28,
    },
    bottomNavLabel: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: typography.navLabelWeight,
      maxWidth: 74,
    },
    bottomNavLabelEmphasized: {
      color: colors.accent,
    },
    bottomNavTextActive: {
      color: colors.primaryDark,
    },
  });
}
