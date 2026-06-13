import { usePathname } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { CustomerDesktopHeader } from "@mobile/components/CustomerDesktopHeader";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { colors } from "@mobile/theme/tokens";

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

export function CustomerDesktopRouteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;

  if (!isDesktop || isDesktopSelfChromePathname(pathname)) {
    return <>{children}</>;
  }

  return (
    <View style={styles.desktopViewport} testID="desktop-route-chrome">
      <CustomerDesktopHeader viewportWidth={width} />
      <View style={styles.routeContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopViewport: {
    backgroundColor: colors.white,
    flex: 1,
    minHeight: "100%",
    width: "100%",
  },
  routeContent: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
});
