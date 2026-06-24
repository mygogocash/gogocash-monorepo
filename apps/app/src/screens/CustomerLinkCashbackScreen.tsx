import { Link } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import linkGoGoCashImage from "../../assets/link-mycashback-gogocash.png";
import linkMyCashbackImage from "../../assets/link-mycashback-shop.png";
import logoMarkImage from "../../assets/nav/logo.png";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopHeader } from "@mobile/components/CustomerDesktopHeader";
import { LinkMyCashbackConnectorDots } from "@mobile/components/LinkMyCashbackConnectorDots";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  getDesktopShellHorizontalPadding,
  mobileShellLayout,
  webLinkMyCashbackIntro,
} from "@mobile/design/webDesignParity";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

export function CustomerLinkCashbackScreen({ mode }: { mode: "link" | "signIn" }) {
  const styles = useThemedStyles(createLinkCashbackScreenStyles);
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const shellPadding = isDesktop
    ? getDesktopShellHorizontalPadding(width)
    : mobileShellLayout.contentHorizontalPadding;
  const routeLabel =
    mode === "signIn" ? tc("MyCashback sign in reference") : tc("Link MyCashback intro");

  return (
    <View style={styles.viewport}>
      <View style={[styles.shell, isDesktop ? styles.desktopShell : styles.phoneFrame]}>
        {isDesktop ? <CustomerDesktopHeader viewportWidth={width} /> : null}
        <ScrollView
          contentContainerStyle={[styles.page, isDesktop ? styles.pageDesktop : styles.pageMobile]}
          showsVerticalScrollIndicator={false}
        >
          <View
            accessibilityLabel={routeLabel}
            style={[
              styles.linkHeroBand,
              isDesktop ? styles.linkHeroBandDesktop : styles.linkHeroBandMobile,
              {
                paddingBottom: isDesktop ? 56 : Math.max(64, insets.bottom + spacing.xl),
                paddingHorizontal: shellPadding,
                paddingTop: isDesktop ? 52 : Math.max(spacing.xl, insets.top + spacing.xl),
              },
            ]}
            testID="link-mycashback-intro"
          >
            <View style={styles.introContent}>
              <Image
                alt="GoGoCash"
                accessibilityIgnoresInvertColors
                accessibilityLabel="GoGoCash"
                source={logoMarkImage}
                style={styles.logoMark}
              />
              <Text style={styles.title}>{tc(webLinkMyCashbackIntro.title)}</Text>
              <Text style={styles.subtitle}>{tc(webLinkMyCashbackIntro.subtitle)}</Text>

              <View style={styles.connectorRow}>
                <View style={styles.connectorImageFrame}>
                  <Image
                    alt={webLinkMyCashbackIntro.goGoCashImageLabel}
                    accessibilityIgnoresInvertColors
                    accessibilityLabel={webLinkMyCashbackIntro.goGoCashImageLabel}
                    resizeMode="contain"
                    source={linkGoGoCashImage}
                    style={styles.connectorImage}
                  />
                </View>

                <LinkMyCashbackConnectorDots
                  colors={webLinkMyCashbackIntro.connectorDots}
                  testID="link-mycashback-connector-dots"
                />

                <View style={styles.connectorImageFrame}>
                  <Image
                    alt={webLinkMyCashbackIntro.myCashbackImageAlt}
                    accessibilityIgnoresInvertColors
                    accessibilityLabel={webLinkMyCashbackIntro.myCashbackImageAlt}
                    resizeMode="contain"
                    source={linkMyCashbackImage}
                    style={styles.connectorImage}
                  />
                </View>
              </View>

              <Text style={styles.cardTitle}>{tc(webLinkMyCashbackIntro.cardTitle)}</Text>
              <Text style={styles.cardDescription}>{tc(webLinkMyCashbackIntro.cardDescription)}</Text>

              <View style={[styles.introActions, isDesktop ? null : styles.introActionsMobile]}>
                <Link asChild href="/method/create">
                  <Pressable
                    accessibilityLabel={tc(webLinkMyCashbackIntro.skipLabel)}
                    style={StyleSheet.flatten([styles.actionButton, styles.skipAction])}
                  >
                    <Text style={styles.skipActionText}>{tc(webLinkMyCashbackIntro.skipLabel)}</Text>
                  </Pressable>
                </Link>
                <Link asChild href="/link-mycashback/my-cashback-sign-in">
                  <Pressable
                    accessibilityLabel={tc(webLinkMyCashbackIntro.linkAccountLabel)}
                    style={StyleSheet.flatten([styles.actionButton, styles.linkAction])}
                  >
                    <Text style={styles.linkActionText}>
                      {tc(webLinkMyCashbackIntro.linkAccountLabel)}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>

          {isDesktop ? (
            <View style={styles.desktopFooter}>
              <CustomerDesktopFooter horizontalPadding={0} viewportWidth={width} />
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function createLinkCashbackScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
  },
  shell: {
    backgroundColor: colors.background,
    flex: 1,
    width: "100%",
  },
  desktopShell: {
    maxWidth: "100%",
  },
  phoneFrame: {
    maxWidth: mobileShellLayout.contentMaxWidth,
  },
  page: {
    flexGrow: 1,
  },
  pageDesktop: {
    backgroundColor: colors.card,
  },
  pageMobile: {
    backgroundColor: colors.background,
  },
  linkHeroBand: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, webLinkMyCashbackIntro.backgroundColor, colors.background),
    width: "100%",
  },
  linkHeroBandDesktop: {
    justifyContent: "center",
    minHeight: 536,
  },
  linkHeroBandMobile: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 620,
  },
  introContent: {
    alignItems: "center",
    maxWidth: 480,
    width: "100%",
  },
  logoMark: {
    borderRadius: radii.md,
    height: 64,
    width: 64,
  },
  title: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.pageTitle,
    fontWeight: typography.pageTitleWeight,
    letterSpacing: typography.letterSpacing,
    lineHeight: typography.pageTitleLineHeight,
    marginTop: 24,
    textAlign: "center",
  },
  subtitle: {
    color: pickThemed(colors, "#4F6C78", colors.muted),
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
    lineHeight: typography.bodyLineHeight,
    marginTop: 10,
    textAlign: "center",
  },
  connectorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
    justifyContent: "center",
    marginTop: 36,
  },
  connectorImageFrame: {
    borderRadius: 32,
    boxShadow: "0 1px 4px rgba(16, 34, 23, 0.06)",
    height: 64,
    overflow: "hidden",
    width: 64,
  },
  connectorImage: {
    height: "100%",
    width: "100%",
  },
  cardTitle: {
    color: pickThemed(colors, "#103522", colors.accent),
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: typography.titleWeight,
    lineHeight: 24,
    marginTop: 36,
    textAlign: "center",
  },
  cardDescription: {
    color: pickThemed(colors, "#4F6C78", colors.muted),
    fontFamily: typography.family,
    fontSize: typography.label,
    fontWeight: typography.bodyWeight,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 400,
    textAlign: "center",
  },
  introActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    maxWidth: 410,
    width: "100%",
  },
  introActionsMobile: {
    flexDirection: "column",
    maxWidth: 360,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  skipAction: {
    backgroundColor: "transparent",
    borderColor: colors.primary,
    borderWidth: 1,
  },
  linkAction: {
    backgroundColor: colors.primary,
  },
  skipActionText: {
    color: pickThemed(colors, colors.primaryDark, colors.primary),
    fontFamily: typography.family,
    fontSize: typography.action,
    fontWeight: typography.actionWeight,
    lineHeight: typography.actionLineHeight,
    textAlign: "center",
  },
  linkActionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.action,
    fontWeight: typography.actionWeight,
    lineHeight: typography.actionLineHeight,
    textAlign: "center",
  },
  desktopFooter: {
    marginTop: -40,
  },
});
}

