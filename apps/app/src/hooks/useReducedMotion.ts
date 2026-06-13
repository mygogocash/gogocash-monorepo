import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// A1 — reduce-motion support. Returns whether the platform's "reduce motion"
// accessibility preference is enabled, and stays in sync with runtime changes.
//
// On native, AccessibilityInfo bridges the OS setting (isReduceMotionEnabled +
// the "reduceMotionChanged" event). On web, react-native-web's AccessibilityInfo
// is itself an adapter over `matchMedia("(prefers-reduced-motion: reduce)")`, so
// the same surface covers both platforms. The listener is removed on unmount to
// avoid a leak.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduced(enabled);
        }
      })
      .catch(() => {
        // Treat a query failure as "no reduction" — never block motion on error.
        if (active) {
          setReduced(false);
        }
      });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      setReduced(enabled);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
