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
 * Pages that ship their own search field. `/category` covers every category stage,
 * since they are one pattern (same layout, same page-scoped search).
 */
const pageScopedSearchPathnames = ["/brand", "/shops", "/discover", "/category"] as const;

/**
 * Founder call (2026-07-23), reversing the 2026-07-22 "show it on every desktop stage"
 * request and restoring the behaviour of #436/#463/#495.
 *
 * The global header search is bound to the home stage: using it from a directory or
 * category page throws the reader back to the homepage. On pages that already own a
 * page-scoped search it was therefore both a duplicate and a trapdoor. Keep it on the
 * home stage and anywhere without its own search; hide it where the page has one.
 */
export function shouldHideDesktopHeaderSearch(pathname: string): boolean {
  const normalizedPathname = normalizeDesktopPathname(pathname);

  return pageScopedSearchPathnames.some(
    (searchPathname) =>
      normalizedPathname === searchPathname ||
      normalizedPathname.startsWith(`${searchPathname}/`),
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
