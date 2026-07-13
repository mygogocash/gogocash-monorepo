import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Cookie as CookieIcon } from "@mobile/theme/icons";
import { Platform, StyleSheet, Text, View } from "react-native";

import { webCookieConsentBanner } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { MotionPressable } from "@mobile/components/MotionPressable";
import {
  readCookieConsentDismissed,
  readCookieConsentDismissedSync,
  writeCookieConsentDismissed,
} from "@mobile/pdpa/cookieConsentStorage";
import { motion } from "@mobile/theme/motion";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, typography } from "@mobile/theme/tokens";

function resolveInitialVisible(): boolean {
  if (Platform.OS === "web") {
    return !readCookieConsentDismissedSync();
  }
  return false;
}

function dispatchCookieDismissedEvent() {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof CustomEvent !== "function"
  ) {
    return;
  }

  window.dispatchEvent(new CustomEvent(webCookieConsentBanner.dismissedEventName));
}

export function CustomerCookieConsentBanner({ isDesktop }: { isDesktop: boolean }) {
  const styles = useThemedStyles(createCookieConsentBannerStyles);
  const tc = useCopy();
  const router = useRouter();
  const [visible, setVisible] = useState(resolveInitialVisible);
  const [hydrated, setHydrated] = useState(Platform.OS === "web");

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let active = true;
    void (async () => {
      const dismissed = await readCookieConsentDismissed();
      if (active) {
        setVisible(!dismissed);
        setHydrated(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const dismissCookieBanner = useCallback(() => {
    void writeCookieConsentDismissed();
    setVisible(false);
    dispatchCookieDismissedEvent();
  }, []);

  const acceptCookieBanner = useCallback(() => {
    try {
      void fetch("/api/pdpa/consent", {
        body: JSON.stringify({
          method: "IN_APP_ONBOARDING",
          purposes: [
            {
              consentText: "Essential cashback & contract — banner accept",
              granted: true,
              purposeCode: "CASHBACK_TRACKING",
            },
            {
              consentText: "Product analytics — banner accept",
              granted: true,
              purposeCode: "ANALYTICS_TRACKING",
            },
          ],
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }).catch(() => undefined);
    } catch {
      // Ignore unavailable fetch in native previews.
    }
    dismissCookieBanner();
  }, [dismissCookieBanner]);

  const openCookieSettings = useCallback(() => {
    dismissCookieBanner();
    router.push("/privacy-center");
  }, [dismissCookieBanner, router]);

  const openPrivacyPolicy = useCallback(() => {
    router.push("/privacy-policy");
  }, [router]);

  if (!hydrated || !visible) {
    return null;
  }

  return (
    <View
      accessibilityLabel={tc(webCookieConsentBanner.title)}
      accessibilityRole="alert"
      style={styles.cookieBanner}
    >
      <View
        style={[
          styles.cookieBannerContent,
          isDesktop ? styles.cookieBannerContentDesktop : styles.cookieBannerContentMobile,
        ]}
      >
        <View
          style={[
            styles.cookieTextCluster,
            isDesktop ? styles.cookieTextClusterDesktop : styles.cookieTextClusterMobile,
          ]}
        >
          <View style={[styles.cookieIconWrap, isDesktop ? null : styles.cookieIconWrapMobile]}>
            <CookieIcon color="#F4C430" size={isDesktop ? 34 : 28} strokeWidth={2} />
          </View>
          <View style={styles.cookieCopy}>
            <Text style={[styles.cookieTitle, isDesktop ? null : styles.cookieTitleMobile]}>
              {tc(webCookieConsentBanner.title)}
            </Text>
            <Text style={[styles.cookieBody, isDesktop ? null : styles.cookieBodyMobile]}>
              {tc(webCookieConsentBanner.bodyPart1)}
              <Text onPress={openPrivacyPolicy} style={styles.cookiePrivacyLink}>
                {tc(webCookieConsentBanner.privacyPolicyLabel)}
              </Text>
              {tc(webCookieConsentBanner.bodyPart2)}
            </Text>
          </View>
        </View>
        <View style={[styles.cookieActions, isDesktop ? null : styles.cookieActionsMobile]}>
          <MotionPressable
            accessibilityRole="button"
            onPress={openCookieSettings}
            pressScale={motion.scale.subtlePress}
            style={styles.cookieSettingsButton}
          >
            <Text style={styles.cookieSettingsText}>{tc(webCookieConsentBanner.decline)}</Text>
          </MotionPressable>
          <MotionPressable
            accessibilityRole="button"
            onPress={acceptCookieBanner}
            pressScale={motion.scale.subtlePress}
            style={styles.cookieAcceptButton}
          >
            <Text style={styles.cookieAcceptText}>{tc(webCookieConsentBanner.allow)}</Text>
          </MotionPressable>
        </View>
      </View>
    </View>
  );
}

function createCookieConsentBannerStyles(colors: ThemeColors) {
  return StyleSheet.create({
  cookieBanner: {
    backgroundColor: "#1D1929",
    borderColor: "rgba(255,255,255,0.06)",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 50,
    boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.35)",
  },
  cookieBannerContent: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "space-between",
    maxWidth: 1000,
    width: "100%",
  },
  cookieBannerContentDesktop: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  cookieBannerContentMobile: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 12,
    paddingBottom: 24,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  cookieTextCluster: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  cookieTextClusterDesktop: {
    gap: 20,
    minWidth: 320,
  },
  cookieTextClusterMobile: {
    alignItems: "flex-start",
    flex: 0,
    gap: 12,
    width: "100%",
  },
  cookieIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
  },
  cookieIconWrapMobile: {
    paddingTop: 24,
    width: 28,
  },
  cookieCopy: {
    flex: 1,
    minWidth: 0,
  },
  cookieTitle: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 6,
  },
  cookieTitleMobile: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 4,
  },
  cookieBody: {
    color: "#D1D1D4",
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
  cookieBodyMobile: {
    fontSize: 13,
    lineHeight: 19,
  },
  cookiePrivacyLink: {
    color: "#F3F3F5",
    fontFamily: typography.family,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  cookieActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  cookieActionsMobile: {
    justifyContent: "space-between",
    width: "100%",
  },
  cookieSettingsButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(244, 196, 48, 0.45)",
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  cookieSettingsText: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  cookieAcceptButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 168,
    paddingHorizontal: 26,
    boxShadow: "0 4px 18px rgba(0, 204, 153, 0.45)",
  },
  cookieAcceptText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
  },
});
}
