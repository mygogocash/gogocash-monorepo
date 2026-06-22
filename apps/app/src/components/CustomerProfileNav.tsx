import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, type View as RNView, StyleSheet, View } from "react-native";

import type { MobileSession } from "@mobile/auth/session";
import { CustomerProfileBar } from "@mobile/components/CustomerProfileBar";
import { CustomerProfileMenu } from "@mobile/components/CustomerProfileMenu";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii } from "@mobile/theme/tokens";

type CustomerProfileNavProps = {
  readonly session: MobileSession;
  readonly onExpandedChange?: (expanded: boolean) => void;
};

/**
 * Desktop account affordance — parity with the web profile dropdown
 * (ProfileBar trigger + ProfileHeaderPopperContent). Pressing the bar toggles an
 * animated popover (`CustomerProfileMenu`); it closes on outside click (web) or
 * on selecting a row. Mirrors `CustomerLocaleRegionControl`'s popover mechanics.
 */
export function CustomerProfileNav({ session, onExpandedChange }: CustomerProfileNavProps) {
  const styles = useThemedStyles(createProfileNavStyles);
  const tc = useCopy();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const progress = useMemo(() => new Animated.Value(0), []);
  const rootRef = useRef<RNView>(null);

  useEffect(() => {
    onExpandedChange?.(open || mounted);
  }, [mounted, onExpandedChange, open]);

  useEffect(() => {
    progress.stopAnimation();

    if (open) {
      setMounted(true);
      Animated.timing(progress, {
        duration: motion.duration.base,
        easing: motion.easing.out,
        toValue: 1,
        useNativeDriver: motion.useNativeDriver,
      }).start();

      return () => progress.stopAnimation();
    }

    if (mounted) {
      Animated.timing(progress, {
        duration: motion.duration.fast,
        easing: motion.easing.in,
        toValue: 0,
        useNativeDriver: motion.useNativeDriver,
      }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });

      return () => progress.stopAnimation();
    }

    return undefined;
  }, [mounted, open, progress]);

  // Close on click outside the trigger/panel (web only; native uses the toggle).
  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    const handlePointerDown = (event: Event) => {
      const root = rootRef.current as unknown as HTMLElement | null;
      const target = event.target as Node | null;
      if (root && target && !root.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  const popoverMotion = {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
      },
      {
        scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }),
      },
    ],
  };

  return (
    <View ref={rootRef} style={styles.root}>
      <MotionPressable
        accessibilityLabel={tc("Account")}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          if (!open) {
            setMounted(true);
          }
          setOpen((value) => !value);
        }}
        pressScale={motion.scale.subtlePress}
        style={styles.chip}
      >
        <CustomerProfileBar open={open} session={session} />
      </MotionPressable>

      {mounted ? (
        <Animated.View
          {...({ role: "dialog" } as const)}
          accessibilityLabel={tc("Account")}
          style={[styles.popover, popoverMotion]}
        >
          <CustomerProfileMenu onNavigate={() => setOpen(false)} session={session} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function createProfileNavStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: {
    position: "relative",
    zIndex: 95,
  },
  // Match the CustomerProfileBar pill radius so MotionPressable's hover-lift boxShadow
  // (and any focus outline) follows the rounded chip instead of rendering a square box.
  chip: {
    borderRadius: radii.chip,
  },
  popover: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
    padding: 10,
    position: "absolute",
    right: 0,
    top: 56,
    width: 380,
    zIndex: 100,
  },
});
}

