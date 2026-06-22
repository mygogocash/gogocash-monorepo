import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import {
  ToastContext,
  type ToastContextValue,
  type ToastOptions,
} from "@mobile/hooks/useToast";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";
import { motion } from "@mobile/theme/motion";

/** Default auto-dismiss timeout for a toast (~2.5s). */
export const TOAST_DEFAULT_DURATION_MS = 2500;

type ToastState = {
  readonly message: string;
  // Monotonic id so re-showing the same message restarts the timer/animation.
  readonly id: number;
};

type ToastViewProps = {
  readonly message: string;
  // Re-mount key changes per show() so the entrance animation replays.
  readonly toastKey: number;
};

// Presentational toast surface. Slides up + fades in on mount; when reduced
// motion is on it appears instantly (no slide/fade), per A1.
function ToastView({ message, toastKey }: ToastViewProps) {
  const reducedMotion = useReducedMotion();
  const styles = useThemedStyles(createToastStyles);
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 12)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    opacity.setValue(0);
    translateY.setValue(12);
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.fast,
        easing: motion.easing.out,
        useNativeDriver: motion.useNativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.duration.fast,
        easing: motion.easing.out,
        useNativeDriver: motion.useNativeDriver,
      }),
    ]);
    animation.start();
    return () => animation.stop();
    // toastKey re-triggers the entrance when a new toast replaces the current one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, toastKey]);

  return (
    <View style={styles.overlay}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, { opacity, transform: [{ translateY }] }]}
      >
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
}

// Host provider: owns the visible-toast state + auto-dismiss timer, and exposes
// show() through context. Mount once near the root (AppProviders).
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (message: string, opts?: ToastOptions) => {
      clearTimer();
      counterRef.current += 1;
      const id = counterRef.current;
      setToast({ message, id });
      const durationMs = opts?.durationMs ?? TOAST_DEFAULT_DURATION_MS;
      timerRef.current = setTimeout(() => {
        // Only dismiss if this timer still owns the visible toast (a newer show()
        // would have cleared this timer already, but guard against races).
        setToast((current) => (current?.id === id ? null : current));
        timerRef.current = null;
      }, durationMs);
    },
    [clearTimer]
  );

  // Clean up a pending timer on unmount (no leak).
  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView message={toast.message} toastKey={toast.id} /> : null}
    </ToastContext.Provider>
  );
}

function createToastStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      bottom: 0,
      left: 0,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      // Non-interactive overlay — kept in style (not the deprecated prop) so touches pass
      // through to the app content below. Cross-platform in RN 0.85 + react-native-web 0.21.
      pointerEvents: "none",
      position: "absolute",
      right: 0,
      // Keep the toast above app content.
      zIndex: 9999,
    },
    toast: {
      alignSelf: "center",
      backgroundColor: colors.ink,
      borderRadius: radii.md,
      maxWidth: 480,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      // Use the boxShadow token (cross-platform on RN 0.85; react-native-web
      // deprecates the spread-in shadow* props) to match the app-wide card pattern.
      boxShadow: shadows.cardCss,
    },
    text: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: typography.body,
      fontWeight: typography.actionWeight,
      lineHeight: typography.bodyLineHeight,
      textAlign: "center",
    },
  });
}
