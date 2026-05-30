import { Link } from "expo-router";
import {
  CircleUserRound as ProfileIcon,
  Home as HomeIcon,
  Link2 as LinkIcon,
  Trophy as TrophyIcon,
  WalletCards as WalletIcon,
} from "@mobile/theme/icons";
import { type ComponentType } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import profileAvatarImage from "../../assets/profile-avatar.png";
import { mobileShellLayout, webMobileBottomNavItems } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

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

export function CustomerMobileBottomNav({
  activeRouteId,
  bottomInset,
}: {
  activeRouteId?: BottomNavRouteId;
  bottomInset: number;
}) {
  return (
    <View
      style={[
        styles.bottomNavWrap,
        {
          paddingBottom: Math.max(10, bottomInset + 8),
        },
      ]}
    >
      <View style={styles.bottomNav}>
        {webMobileBottomNavItems.map((item) => {
          const active = getBottomNavRouteId(item.href) === activeRouteId;
          const emphasized = "emphasized" in item && item.emphasized;

          return (
            <Link asChild href={item.href as never} key={item.label}>
              <Pressable
                style={StyleSheet.flatten([
                  styles.bottomNavItem,
                  emphasized ? styles.bottomNavItemEmphasized : null,
                  active ? styles.bottomNavItemActive : null,
                ])}
              >
                <View
                  style={[styles.bottomNavIcon, emphasized ? styles.bottomNavIconEmphasized : null]}
                >
                  <BottomNavIcon active={active} emphasized={emphasized} name={item.icon} />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.bottomNavLabel,
                    emphasized ? styles.bottomNavLabelEmphasized : null,
                    active ? styles.bottomNavTextActive : null,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

function BottomNavIcon({
  active,
  emphasized,
  name,
}: {
  active: boolean;
  emphasized: boolean;
  name: string;
}) {
  const Icon = bottomNavIcons[name] ?? HomeIcon;
  const color = emphasized ? colors.white : active ? colors.primaryDark : colors.muted;

  if (name === "profile" && active) {
    return (
      <Image
        alt="Profile avatar"
        source={profileAvatarImage}
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

const styles = StyleSheet.create({
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
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: "rgba(216,226,217,0.7)",
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
    marginTop: -22,
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
    height: 72,
    width: 72,
  },
  bottomNavProfileAvatar: {
    borderRadius: radii.chip,
    height: 34,
    width: 34,
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
