import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { usePathname } from "expo-router";

import { CustomerDesktopHeader } from "@mobile/components/CustomerDesktopHeader";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

export const desktopSelfChromePathnames = [
  "/",
  "/login",
  "/register",
  "/account-setup",
  "/privacy-policy",
  "/link-mycashback",
  "/link-mycashback/my-cashback-sign-in",
] as const;

function normalizeDesktopPathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function isDesktopSelfChromePathname(pathname: string) {
  const normalizedPathname = normalizeDesktopPathname(pathname);

  return desktopSelfChromePathnames.some((selfChromePathname) => {
    return selfChromePathname === normalizedPathname;
  });
}

/**
 * Founder request (2026-07-22): the global desktop header search must be available on
 * EVERY desktop stage, so it is never hidden. This intentionally overrides #436/#463/#495,
 * which hid it on the directory pages (/category, /brand, /shops, /discover) that own a
 * page-scoped search — those pages now show BOTH the global header search and their own
 * page-scoped search. Kept as a seam (the RouteChrome -> CustomerDesktopHeader wiring is
 * unchanged) so per-route hiding can be reintroduced by returning true for a route here.
 */
export function shouldHideDesktopHeaderSearch(_pathname: string): boolean {
  return false;
}

export function CustomerDesktopRouteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const styles = useThemedStyles(createRouteChromeStyles);

  if (!isDesktop || isDesktopSelfChromePathname(pathname)) {
    return <>{children}</>;
  }

  return (
    <View style={styles.desktopViewport} testID="desktop-route-chrome">
      <CustomerDesktopHeader
        hideSearch={shouldHideDesktopHeaderSearch(pathname)}
        viewportWidth={width}
      />
      <View style={styles.routeContent}>{children}</View>
    </View>
  );
}

function createRouteChromeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    desktopViewport: {
      backgroundColor: colors.card,
      flex: 1,
      width: "100%",
    },
    routeContent: {
      flex: 1,
      minHeight: 0,
      width: "100%",
    },
  });
}
