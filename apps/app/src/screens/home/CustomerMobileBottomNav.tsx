import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { webMobileBottomNavItems } from "@mobile/design/webDesignParity";
import { filterHiddenBottomNavItems } from "@mobile/config/featureFlags";
import {
  GOLINK_COMING_SOON_OPACITY,
  GoLinkSoonBadge,
  isGoLinkComingSoonTab,
} from "@mobile/components/goLinkNavTab";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { queueProtectedBottomNavWhileSessionHydrates } from "@mobile/auth/protectedBottomNavPress";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { BottomNavIcon } from "./BottomNavIcon";
import { useHomeScreenStyles } from "./homeScreenHooks";

export function CustomerMobileBottomNav({
  bottomInset,
  onGoLinkPress,
}: {
  bottomInset: number;
  onGoLinkPress: () => void;
}) {
  const styles = useHomeScreenStyles();
  const tc = useCopy();
  const router = useRouter();
  const { isAuthed, ready } = useAuthGuardSession();

  function handleBottomNavPress(href: string) {
    const protectedTarget = queueProtectedBottomNavWhileSessionHydrates(href, {
      isAuthed,
      ready,
    });
    if (protectedTarget) {
      router.push(protectedTarget as never);
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
      <View style={styles.bottomNav}>
        {filterHiddenBottomNavItems(webMobileBottomNavItems).map((item) => {
          const active = item.label === "Home";
          const emphasized = "emphasized" in item && item.emphasized;
          const comingSoon = isGoLinkComingSoonTab(item.href);
          const navItemStyle = StyleSheet.flatten([
            styles.bottomNavItem,
            emphasized ? styles.bottomNavItemEmphasized : null,
            active ? styles.bottomNavItemActive : null,
            comingSoon ? { opacity: GOLINK_COMING_SOON_OPACITY } : null,
          ]);
          const navItemContent = (
            <>
              <View
                style={[styles.bottomNavIcon, emphasized ? styles.bottomNavIconEmphasized : null]}
              >
                <BottomNavIcon active={active} emphasized={emphasized} name={item.icon} />
                {comingSoon ? <GoLinkSoonBadge /> : null}
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
            </>
          );

          if (item.href === "/golink") {
            return (
              <MotionPressable
                accessibilityRole="button"
                accessibilityState={comingSoon ? { disabled: true } : undefined}
                disabled={comingSoon}
                key={item.label}
                onPress={comingSoon ? undefined : onGoLinkPress}
                pressScale={motion.scale.subtlePress}
                style={navItemStyle}
              >
                {navItemContent}
              </MotionPressable>
            );
          }

          return (
            <MotionPressable
              accessibilityRole="button"
              key={item.label}
              onPress={() => handleBottomNavPress(item.href)}
              pressScale={motion.scale.subtlePress}
              style={navItemStyle}
            >
              {navItemContent}
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}
