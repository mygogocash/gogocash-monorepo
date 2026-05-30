import { Link } from "expo-router";
import {
  CheckCircle2 as CheckCircleIcon,
  ChevronLeft as ChevronLeftIcon,
  Link as LinkIcon,
} from "@mobile/theme/icons";
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
import { MotionPressable } from "@mobile/components/MotionPressable";
import {
  getDesktopShellHorizontalPadding,
  mobileShellLayout,
} from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

const myCashbackSignInAlt = "MyCashback sign-in screen (desktop reference)";

const accountOptions = [
  {
    balance: "1,240.00 THB",
    label: "Connected account",
    meta: "mycashback.user@example.com",
    selected: true,
  },
  {
    balance: "320.50 THB",
    label: "Secondary MyCashback",
    meta: "Waiting for confirmation",
    selected: false,
  },
] as const;

export function CustomerMyCashbackSignInScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const shellPadding = isDesktop
    ? getDesktopShellHorizontalPadding(width)
    : mobileShellLayout.contentHorizontalPadding;

  return (
    <View style={styles.viewport}>
      <View style={[styles.shell, isDesktop ? styles.desktopShell : styles.phoneFrame]}>
        {isDesktop ? <CustomerDesktopHeader viewportWidth={width} /> : null}
        <ScrollView
          contentContainerStyle={[styles.page, isDesktop ? styles.pageDesktop : null]}
          showsVerticalScrollIndicator={false}
        >
          <View
            accessibilityLabel={myCashbackSignInAlt}
            style={[
              styles.heroBand,
              {
                paddingBottom: isDesktop ? 56 : Math.max(64, insets.bottom + spacing.xl),
                paddingHorizontal: shellPadding,
                paddingTop: isDesktop ? 52 : Math.max(spacing.xl, insets.top + spacing.xl),
              },
            ]}
            testID="mycashbackSignIn"
          >
            <View style={[styles.referenceCard, isDesktop ? styles.referenceCardDesktop : null]}>
              <Link asChild href="/link-mycashback">
                <Pressable accessibilityRole="link" style={styles.backLink}>
                  <ChevronLeftIcon
                    color={colors.accent}
                    size={24}
                    strokeWidth={typography.iconStrokeWidth}
                  />
                  <Text style={styles.backLinkText}>Back</Text>
                </Pressable>
              </Link>
              <Image
                alt="GoGoCash"
                accessibilityIgnoresInvertColors
                accessibilityLabel="GoGoCash"
                source={logoMarkImage}
                style={styles.logoMark}
              />
              <Text style={styles.title}>Select Your Preferred Link</Text>
              <Text style={styles.subtitle}>
                Choose the MyCashback account you want to connect with GoGoCash.
              </Text>

              <View style={styles.connectorRow}>
                <View style={styles.connectorImageFrame}>
                  <Image
                    alt="MyCashback account"
                    resizeMode="contain"
                    source={linkMyCashbackImage}
                    style={styles.connectorImage}
                  />
                </View>
                <View style={styles.connectorLine}>
                  <LinkIcon color={colors.primaryDark} size={20} strokeWidth={2.2} />
                </View>
                <View style={styles.connectorImageFrame}>
                  <Image
                    alt="GoGoCash account"
                    resizeMode="contain"
                    source={linkGoGoCashImage}
                    style={styles.connectorImage}
                  />
                </View>
              </View>

              <View style={styles.accountList}>
                {accountOptions.map((account) => (
                  <View
                    key={account.label}
                    style={[styles.accountRow, account.selected ? styles.accountRowSelected : null]}
                  >
                    <View style={styles.accountCopy}>
                      <Text style={styles.accountLabel}>{account.label}</Text>
                      <Text style={styles.accountMeta}>{account.meta}</Text>
                    </View>
                    <View style={styles.accountStatus}>
                      <Text style={styles.accountBalance}>{account.balance}</Text>
                      {account.selected ? (
                        <CheckCircleIcon
                          color={colors.primaryDark}
                          size={20}
                          strokeWidth={typography.iconStrokeWidth}
                        />
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>

              <Link asChild href="/method/create">
                <MotionPressable
                  accessibilityLabel="Link Selected Account"
                  accessibilityRole="link"
                  pressScale={0.98}
                  style={styles.primaryAction}
                >
                  <Text style={styles.primaryActionText}>Link Selected Account</Text>
                </MotionPressable>
              </Link>
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

const styles = StyleSheet.create({
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
    backgroundColor: "#DCEBFF",
    flexGrow: 1,
  },
  pageDesktop: {
    backgroundColor: colors.white,
  },
  heroBand: {
    alignItems: "center",
    backgroundColor: "#DCEBFF",
    minHeight: 574,
    width: "100%",
  },
  referenceCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "rgba(63, 105, 146, 0.14)",
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    gap: spacing.md,
    maxWidth: 480,
    padding: spacing.lg,
    width: "100%",
  },
  referenceCardDesktop: {
    minHeight: 574,
  },
  backLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
  },
  backLinkText: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  logoMark: {
    borderRadius: 12,
    height: 54,
    width: 54,
  },
  title: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#46667C",
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 22,
    maxWidth: 360,
    textAlign: "center",
  },
  connectorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  connectorImageFrame: {
    alignItems: "center",
    backgroundColor: "#EAF8FF",
    borderRadius: 28,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  connectorImage: {
    height: 42,
    width: 42,
  },
  connectorLine: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.chip,
    height: 38,
    justifyContent: "center",
    width: 54,
  },
  accountList: {
    gap: spacing.sm,
    width: "100%",
  },
  accountRow: {
    alignItems: "center",
    backgroundColor: "#F8FBFF",
    borderColor: "#D6E7F7",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 74,
    padding: spacing.md,
  },
  accountRowSelected: {
    backgroundColor: "#E7FBF6",
    borderColor: colors.primary,
  },
  accountCopy: {
    flex: 1,
    gap: 4,
  },
  accountLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
  accountMeta: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  accountStatus: {
    alignItems: "flex-end",
    gap: 4,
  },
  accountBalance: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    width: "100%",
  },
  primaryActionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
  desktopFooter: {
    backgroundColor: colors.white,
  },
});
