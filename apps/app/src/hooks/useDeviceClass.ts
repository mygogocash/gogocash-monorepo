import { useWindowDimensions } from "react-native";

import {
  type DeviceClass,
  getDeviceClass,
  getTabletContentFrame,
  type TabletContentFrame,
} from "@mobile/design/webDesignParity";

/**
 * Canonical device class for the current viewport: "mobile" (<768),
 * "tablet" (768-1023), or "desktop" (>=1024). Use this instead of re-deriving
 * `width >= desktopBreakpoint` per screen so the tablet band is handled
 * consistently. Width-driven, so it works identically on web and native.
 */
export function useDeviceClass(): DeviceClass {
  const { width } = useWindowDimensions();
  return getDeviceClass(width);
}

/** Convenience flag for the 768-1023px tablet band. */
export function useIsTablet(): boolean {
  return useDeviceClass() === "tablet";
}

/**
 * Centered content frame for single-column tablet screens (forms, detail, hubs).
 * Returns a zero-offset frame outside the tablet band callers can ignore.
 */
export function useTabletContentFrame(): TabletContentFrame {
  const { width } = useWindowDimensions();
  return getTabletContentFrame(width);
}
