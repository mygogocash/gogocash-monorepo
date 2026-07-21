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
 * #436 / #463 / #495 — every directory page that owns a page-scoped search; hide the
 * global header search so users are not bounced to homepage search.
 *
 * /shops and /discover are exact paths (their detail routes are the singular /shop/:id
 * and /product/:slug, which have no search of their own and must keep the header search).
 */
export function shouldHideDesktopHeaderSearch(pathname: string) {
  const normalizedPathname = normalizeDesktopPathname(pathname);
  return (
    normalizedPathname === "/category" ||
    normalizedPathname.startsWith("/category/") ||
    normalizedPathname === "/brand" ||
    normalizedPathname.startsWith("/brand/") ||
    normalizedPathname === "/shops" ||
    normalizedPathname === "/discover"
  );
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
