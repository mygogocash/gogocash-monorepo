import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  CheckCircle as CheckCircleIcon,
  ExternalLink as ExternalLinkIcon,
  Info as InfoIcon,
  Link2 as LinkIcon,
  X as CloseIcon,
} from "@mobile/theme/icons";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import golinkBannerIllustrationImage from "../../assets/golink-banner-illustration.png";
import golinkResultProductImage from "../../assets/golink-result-product-demo.png";
import golinkResultShopBadgeImage from "../../assets/golink-result-shop-badge.png";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import {
  GoLinkGuidelineFlowIllustration,
  GoLinkGuidelineStepIllustration,
} from "@mobile/components/golink/GoLinkGuidelineIllustrations";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  mobileShellLayout,
  webGoLinkFeature,
  webGoLinkModalLayout,
} from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import { haptics } from "@mobile/lib/haptics";
import { getGoLinkSourceHost, isValidGoLinkUrl } from "@mobile/features/golink";
import { motion } from "@mobile/theme/motion";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

const guidelineSteps = [
  {
    step: 1 as const,
    text: "Go to marketplace to look for the products you want, and tap “Share” to copy the link.",
  },
  {
    step: 2 as const,
    text: "Come back to GoGoCash, click “Paste and Go”, and check your receivable cashback.",
  },
  {
    step: 3 as const,
    text: "Tap “Shop Now” to go directly to the shop in the marketplace, then wait for your cashback to be approved.",
  },
] as const;

const goLinkShopNowRoute = "/shop/brand-orbit-airways-1003?golinkContinue=1";

type GoLinkPresentation = "route" | "homeSheet";

type DismissableOverlayMotionOptions = {
  enterTranslateY?: number;
  exitTranslateY?: number;
  onDismiss: () => void;
};

function useDismissableOverlayMotion({
  enterTranslateY = 24,
  exitTranslateY = 24,
  onDismiss,
}: DismissableOverlayMotionOptions) {
  // Wave B (B5): reduce-motion gate for the sheet/popover/overlay motion. When the platform
  // "reduce motion" flag is on, every enter/exit Animated.timing collapses to a 0ms duration so
  // overlays appear/dismiss instantly with the SAME end state (opacity 1/0, translateY 0/exit). The
  // exit's `finished` callback still fires (a 0ms timing completes), so onDismiss is unaffected.
  const reduced = useReducedMotion();
  const isClosingRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const overlayOpacity = useMemo(() => new Animated.Value(0), []);
  const contentTranslateY = useMemo(() => new Animated.Value(enterTranslateY), [enterTranslateY]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        duration: reduced ? 0 : motion.duration.base,
        easing: motion.easing.out,
        toValue: 1,
        useNativeDriver: motion.useNativeDriver,
      }),
      Animated.timing(contentTranslateY, {
        duration: reduced ? 0 : motion.duration.emphasis,
        easing: motion.easing.out,
        toValue: 0,
        useNativeDriver: motion.useNativeDriver,
      }),
    ]).start();

    return () => {
      overlayOpacity.stopAnimation();
      contentTranslateY.stopAnimation();
    };
  }, [contentTranslateY, overlayOpacity, reduced]);

  const runExitAnimation = useCallback(
    (afterDismiss?: () => void) => {
      if (isClosingRef.current) {
        return;
      }

      isClosingRef.current = true;
      setIsClosing(true);
      overlayOpacity.stopAnimation();
      contentTranslateY.stopAnimation();

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          duration: reduced ? 0 : motion.duration.fast,
          easing: motion.easing.in,
          toValue: 0,
          useNativeDriver: motion.useNativeDriver,
        }),
        Animated.timing(contentTranslateY, {
          duration: reduced ? 0 : motion.duration.base,
          easing: motion.easing.in,
          toValue: exitTranslateY,
          useNativeDriver: motion.useNativeDriver,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          (afterDismiss ?? onDismiss)();
        }
      });
    },
    [contentTranslateY, exitTranslateY, onDismiss, overlayOpacity, reduced]
  );

  return {
    contentTranslateY,
    isClosing,
    overlayOpacity,
    runExitAnimation,
  };
}

export function CustomerGoLinkScreen({
  onClose,
  presentation = "route",
}: {
  onClose?: () => void;
  presentation?: GoLinkPresentation;
}) {
  const styles = useThemedStyles(createGoLinkScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const isHomeSheet = presentation === "homeSheet";
  const [goLinkInput, setGoLinkInput] = useState("");
  const [goLinkError, setGoLinkError] = useState("");
  // Swap the resting border for a brand-green focus ring (and suppress the orange OS-accent UA
  // outline on web). One flag suffices: there is a single editable input on this screen.
  const [isInputFocused, setInputFocused] = useState(false);
  const [goLinkResultOpen, setGoLinkResultOpen] = useState(false);
  const [goLinkResultHref, setGoLinkResultHref] = useState("");
  const [guidelineOpen, setGuidelineOpen] = useState(false);
  const dismissGoLink = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }

    router.replace("/");
  }, [onClose, router]);
  const {
    contentTranslateY: sheetTranslateY,
    isClosing,
    overlayOpacity: backdropOpacity,
    runExitAnimation,
  } = useDismissableOverlayMotion({
    enterTranslateY: 32,
    exitTranslateY: 40,
    onDismiss: dismissGoLink,
  });

  const handlePasteAndGo = () => {
    const nextGoLinkInput = goLinkInput.trim();

    setGoLinkResultOpen(false);
    setGoLinkError("");

    if (!nextGoLinkInput) {
      setGoLinkError(webGoLinkFeature.emptyError);
      return;
    }

    if (!isValidGoLinkUrl(nextGoLinkInput)) {
      setGoLinkError(webGoLinkFeature.invalidUrlError);
      return;
    }

    setGoLinkResultHref(nextGoLinkInput);
    setGoLinkResultOpen(true);
  };

  return (
    <View
      style={[
        styles.viewport,
        isHomeSheet && styles.homeSheetViewport,
        { pointerEvents: isClosing ? "none" : "auto" },
      ]}
    >
      <Animated.View
        style={[styles.scrim, { opacity: backdropOpacity, pointerEvents: "none" }]}
      />
      <Pressable
        accessibilityLabel={tc("Close GoGoLink backdrop")}
        accessibilityRole="button"
        onPress={() => runExitAnimation()}
        style={styles.scrimHitArea}
      />
      <View style={[styles.phoneFrame, isDesktop && styles.desktopPhoneFrame]}>
        <View
          style={[
            styles.page,
            isDesktop && styles.desktopPage,
            { paddingTop: Math.max(spacing.sm, insets.top + spacing.sm) },
          ]}
        >
          <Animated.View
            style={[
              styles.sheetChrome,
              isDesktop && styles.desktopSheetChrome,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={styles.sheetToolbar}>
              <View style={styles.toolbarSide} />
              <View style={styles.handle} />
              <View style={styles.toolbarSide}>
                <MotionPressable
                  accessibilityLabel={tc("Close GoGoLink")}
                  accessibilityRole="button"
                  onPress={() => runExitAnimation()}
                  pressScale={motion.scale.subtlePress}
                  style={styles.closeButton}
                >
                  <CloseIcon color="#3D524C" size={24} strokeWidth={typography.iconStrokeWidth} />
                </MotionPressable>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetScrollerContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.sheetScroller}
            >
              <View style={styles.modalHeroCard}>
                <View style={[styles.modalHeroBackdrop, { pointerEvents: "none" }]} />
                <MotionPressable
                  accessibilityLabel={tc("GoGoLink information")}
                  accessibilityRole="button"
                  onPress={() => {
                    haptics.impact();
                    setGuidelineOpen(true);
                  }}
                  pressScale={motion.scale.subtlePress}
                  style={styles.infoButton}
                >
                  <InfoIcon
                    color={colors.accentSoft}
                    size={18}
                    strokeWidth={typography.iconStrokeWidth}
                  />
                </MotionPressable>

                <View style={[styles.heroContent, isDesktop && styles.desktopHeroContent]}>
                  <View style={styles.modalIllustrationWrap}>
                    <Image
                      alt={tc("GoGoLink cashback link illustration")}
                      accessibilityIgnoresInvertColors
                      resizeMode="contain"
                      source={golinkBannerIllustrationImage}
                      style={styles.illustration}
                    />
                  </View>

                  <View style={styles.formArea}>
                    <Text numberOfLines={3} style={styles.title}>
                      {tc(webGoLinkFeature.title)}
                    </Text>
                    <View
                      style={[
                        styles.inputShell,
                        isInputFocused ? styles.inputShellFocused : null,
                        // Error border is applied last so it wins when a field is both focused and errored.
                        Boolean(goLinkError) && styles.inputShellError,
                      ]}
                    >
                      <LinkIcon
                        color={colors.primaryDark}
                        size={18}
                        strokeWidth={typography.iconStrokeWidth}
                      />
                      <TextInput
                        accessibilityLabel={tc(webGoLinkFeature.inputLabel)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        inputMode="url"
                        onBlur={() => setInputFocused(false)}
                        onChangeText={(nextValue) => {
                          setGoLinkInput(nextValue);
                          if (goLinkError) {
                            setGoLinkError("");
                          }
                        }}
                        onFocus={() => setInputFocused(true)}
                        onSubmitEditing={handlePasteAndGo}
                        placeholder={tc(webGoLinkFeature.inputPlaceholder)}
                        placeholderTextColor="#93A8B5"
                        returnKeyType="go"
                        style={styles.input}
                        value={goLinkInput}
                      />
                    </View>
                    {goLinkError ? <Text style={styles.errorText}>{tc(goLinkError)}</Text> : null}
                    <MotionPressable
                      accessibilityRole="button"
                      onPress={handlePasteAndGo}
                      style={styles.primaryAction}
                    >
                      <Text style={styles.primaryActionText}>{tc(webGoLinkFeature.ctaLabel)}</Text>
                    </MotionPressable>
                  </View>
                </View>
              </View>

              <View style={[styles.card, styles.offscreenGuideCard]}>
                <Text style={styles.sectionTitle}>{tc("How it works")}</Text>
                {guidelineSteps.map((step, index) => (
                  <View key={step.text} style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{tc(step.text)}</Text>
                  </View>
                ))}
              </View>
              <CustomerDesktopFooterSlot style={styles.desktopFooter} />
            </ScrollView>
          </Animated.View>
        </View>
      </View>
      {guidelineOpen ? <GoLinkGuidelineDialog onClose={() => setGuidelineOpen(false)} /> : null}
      {goLinkResultOpen && goLinkResultHref ? (
        <GoLinkResultDialog
          href={goLinkResultHref}
          onClose={() => {
            setGoLinkResultOpen(false);
            setGoLinkResultHref("");
          }}
          onShopNow={() => {
            setGoLinkResultOpen(false);
            setGoLinkResultHref("");
            router.push(goLinkShopNowRoute);
          }}
        />
      ) : null}
    </View>
  );
}

export function GoLinkGuidelineDialog({ onClose }: { onClose: () => void }) {
  const styles = useThemedStyles(createGoLinkScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { contentTranslateY, isClosing, overlayOpacity, runExitAnimation } =
    useDismissableOverlayMotion({ onDismiss: onClose });

  return (
    <View
      accessibilityLabel={tc("Easy to earn cashback by GoGoLink")}
      accessibilityViewIsModal
      style={[styles.guidelineOverlay, { pointerEvents: isClosing ? "none" : "auto" }]}
    >
      <Animated.View
        style={[styles.guidelineBackdrop, { opacity: overlayOpacity, pointerEvents: "none" }]}
      />
      <Pressable
        accessibilityLabel={tc("Close GoLink guide backdrop")}
        accessibilityRole="button"
        onPress={() => runExitAnimation()}
        style={styles.overlayHitArea}
      />
      <Animated.View
        style={[
          styles.guidelineDialog,
          { opacity: overlayOpacity, transform: [{ translateY: contentTranslateY }] },
        ]}
      >
        <MotionPressable
          accessibilityLabel={tc("Close GoLink guide")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => runExitAnimation()}
          pressScale={motion.scale.subtlePress}
          style={styles.guidelineCloseButton}
        >
          <CloseIcon color={colors.ink} size={22} strokeWidth={typography.iconStrokeWidth} />
        </MotionPressable>

        <View style={styles.guidelineFlowWrap}>
          <GoLinkGuidelineFlowIllustration />
        </View>

        <View style={styles.guidelineCopyBlock}>
          <Text style={styles.guidelineTitle}>{tc("Easy to earn cashback by GoGoLink")}</Text>
          <Text style={styles.guidelineSubtitle}>
            {tc("Follow these 3 steps to shop and earn with GoGoCash")}
          </Text>
        </View>

        <View style={styles.guidelineStepList}>
          {guidelineSteps.map((step, index) => (
            <View
              key={step.text}
              style={[styles.guidelineStepRow, index === 1 && styles.guidelineMiddleStepRow]}
            >
              <View style={styles.guidelineStepThumb}>
                <GoLinkGuidelineStepIllustration step={step.step} />
              </View>
              <Text style={styles.guidelineStepText}>{tc(step.text)}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

export function GoLinkResultDialog({
  href,
  onClose,
  onShopNow,
}: {
  href: string;
  onClose: () => void;
  onShopNow: () => void;
}) {
  const styles = useThemedStyles(createGoLinkScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const sourceHost = getGoLinkSourceHost(href);
  const [termsPanelOpen, setTermsPanelOpen] = useState(false);
  const { contentTranslateY, isClosing, overlayOpacity, runExitAnimation } =
    useDismissableOverlayMotion({ onDismiss: onClose });

  return (
    <View
      accessibilityLabel={tc("GoGoLink link preview")}
      accessibilityViewIsModal
      style={[styles.resultOverlay, { pointerEvents: isClosing ? "none" : "auto" }]}
    >
      <Animated.View
        style={[styles.resultBackdrop, { opacity: overlayOpacity, pointerEvents: "none" }]}
      />
      <Pressable
        accessibilityLabel={tc("Close link preview backdrop")}
        accessibilityRole="button"
        onPress={() => runExitAnimation()}
        style={styles.overlayHitArea}
      />
      <Animated.View
        style={[
          styles.resultDialog,
          { opacity: overlayOpacity, transform: [{ translateY: contentTranslateY }] },
        ]}
      >
        <MotionPressable
          accessibilityLabel={tc("Close link preview")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => runExitAnimation()}
          pressScale={motion.scale.subtlePress}
          style={styles.resultCloseButton}
        >
          <CloseIcon color={colors.ink} size={22} strokeWidth={typography.iconStrokeWidth} />
        </MotionPressable>

        {termsPanelOpen ? (
          <GoLinkTermsPanel onBack={() => setTermsPanelOpen(false)} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.resultScrollerContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.resultProductWrap}>
              <Image
                alt={tc("Example product image for illustration")}
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={golinkResultProductImage}
                style={styles.resultProductImage}
              />
              <Image
                alt={tc("Example marketplace badge")}
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={golinkResultShopBadgeImage}
                style={styles.resultShopBadge}
              />
            </View>

            <View style={styles.resultDetails}>
              <Text style={styles.resultTitle}>
                LA GLACE Pads ลากลาส โทนเนอร์แพด 160ml (Acne Care/Moisturizing/Skin Barrier/Vit C)
              </Text>
              {sourceHost ? (
                <Text numberOfLines={1} style={styles.resultHost}>
                  {tc("Link from")} {sourceHost}
                </Text>
              ) : null}
              <View style={styles.resultPriceRow}>
                <Text style={styles.resultPriceAmount}>290</Text>
                <Text style={styles.resultPriceCurrency}>THB</Text>
              </View>
            </View>

            <View style={styles.resultCashbackBox}>
              <View style={styles.resultCashbackLine}>
                <Text style={styles.resultCashbackText}>{tc("Earn cashback")}</Text>
                <Text style={styles.resultCashbackText}>5.80</Text>
                <Text style={styles.resultCashbackText}>THB</Text>
                <Text style={styles.resultCashbackText}>(2%)</Text>
              </View>
              <MotionPressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.impact();
                  setTermsPanelOpen(true);
                }}
                pressScale={motion.scale.subtlePress}
                style={styles.resultTermsButton}
              >
                <View style={styles.resultTermsLabel}>
                  <InfoIcon
                    color={colors.primaryDark}
                    size={16}
                    strokeWidth={typography.iconStrokeWidth}
                  />
                  <Text numberOfLines={2} style={styles.resultTermsText}>
                    {tc("Check exclusions and T&Cs")}
                  </Text>
                </View>
                <ExternalLinkIcon
                  color={colors.primaryDark}
                  size={16}
                  strokeWidth={typography.iconStrokeWidth}
                />
              </MotionPressable>
            </View>

            <Text style={styles.resultDisclaimer}>
              {tc(
                "Product image, price, and cashback shown here are examples only. Actual rewards depend on the shop and offer terms."
              )}
            </Text>

            <View style={styles.successBar}>
              <CheckCircleIcon
                color={colors.primary}
                size={18}
                strokeWidth={typography.iconStrokeWidth}
              />
              <Text style={styles.successText}>{tc("Link pasted successfully!")}</Text>
              <MotionPressable
                accessibilityLabel={tc("Dismiss success message")}
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => undefined}
                pressScale={motion.scale.subtlePress}
                style={styles.successDismissButton}
              >
                <CloseIcon color="rgba(255, 255, 255, 0.85)" size={16} />
              </MotionPressable>
            </View>

            <MotionPressable
              accessibilityRole="button"
              onPress={() => runExitAnimation(onShopNow)}
              pressScale={motion.scale.press}
              style={styles.shopNowButton}
            >
              <Text style={styles.shopNowText}>{tc("Shop Now")}</Text>
            </MotionPressable>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function GoLinkTermsPanel({ onBack }: { onBack: () => void }) {
  const styles = useThemedStyles(createGoLinkScreenStyles);
  const tc = useCopy();
  const terms = [
    {
      title: "Exclusions",
      body: "Some brands, categories, or payment types may be excluded from cashback. Promo codes from other sites and certain fulfilment paths may also disqualify a purchase.",
    },
    {
      title: "Refunds, Cancellations, & no-shows",
      body: "If your order is refunded, cancelled, or not completed, related cashback may be voided or adjusted according to the store and GoGoCash rules.",
    },
    {
      title: "Tracking Disclaimers",
      body: "Cashback tracking depends on the store confirming your purchase. It can take time to appear, and some sessions may not track if cookies are blocked or checkout was interrupted.",
    },
    {
      title: "Other terms and conditions",
      body: "Offer amounts, eligibility, and rules can change. Always review the store page and any campaign terms before you pay.",
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.termsScrollerContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.termsHeader}>
        <MotionPressable
          accessibilityLabel={tc("Back to link preview")}
          accessibilityRole="button"
          onPress={onBack}
          pressScale={motion.scale.subtlePress}
          style={styles.termsBackButton}
        >
          <Text style={styles.termsBackText}>‹</Text>
        </MotionPressable>
        <Text style={styles.termsTitle}>{tc("Terms and Exclusions")}</Text>
      </View>

      <View style={styles.termsList}>
        {terms.map((term, index) => (
          <View key={term.title} style={styles.termsItem}>
            <View style={styles.termsItemHeader}>
              <View style={styles.termsHelpDot}>
                <Text style={styles.termsHelpText}>?</Text>
              </View>
              <Text style={styles.termsItemTitle}>{tc(term.title)}</Text>
            </View>
            {index === 0 ? <Text style={styles.termsItemBody}>{tc(term.body)}</Text> : null}
          </View>
        ))}
      </View>

      <View style={styles.cashbackTipsBlock}>
        <Text style={styles.cashbackTipsTitle}>{tc("💡 Cashback Tips")}</Text>
        <Text style={styles.cashbackTipsText}>{tc("Scroll down to read all tips.")}</Text>
      </View>
    </ScrollView>
  );
}
function createGoLinkScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "flex-end",
  },
  homeSheetViewport: {
    backgroundColor: "transparent",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 40,
  },
  scrim: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scrimHitArea: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  phoneFrame: {
    flex: 1,
    maxWidth: mobileShellLayout.contentMaxWidth,
    width: "100%",
  },
  desktopPhoneFrame: {
    maxWidth: 680,
  },
  page: {
    gap: spacing.homeStackGap,
    justifyContent: "flex-end",
    minHeight: "100%",
    paddingHorizontal: 0,
  },
  desktopPage: {
    justifyContent: "center",
    paddingBottom: spacing.xl,
  },
  sheetChrome: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: webGoLinkModalLayout.sheetMobileHeight,
    maxHeight: "92%",
    minHeight: webGoLinkModalLayout.sheetMobileHeight,
    overflow: "hidden",
    boxShadow: shadows.bottomNavCss,
  },
  desktopSheetChrome: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    minHeight: webGoLinkModalLayout.sheetMobileHeight,
  },
  sheetToolbar: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: webGoLinkModalLayout.toolbarHeight,
    paddingHorizontal: spacing.sm,
  },
  sheetScroller: {
    flex: 1,
  },
  sheetScrollerContent: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: 0,
    paddingTop: 4,
  },
  desktopFooter: {
    marginTop: 64,
  },
  toolbarSide: {
    alignItems: "flex-end",
    flex: 1,
  },
  handle: {
    backgroundColor: "#C9CFCB",
    borderRadius: radii.chip,
    height: 4,
    width: 40,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  modalHeroCard: {
    backgroundColor: pickThemed(colors, "#F8FBFF", colors.card),
    borderColor: "#BEE8DE",
    borderRadius: webGoLinkModalLayout.cardRadius,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: webGoLinkModalLayout.cardMarginHorizontal,
    minHeight: webGoLinkModalLayout.cardMobileMinHeight,
    overflow: "hidden",
    paddingBottom: 16,
    paddingHorizontal: spacing.md,
    paddingTop: 26,
    boxShadow: shadows.cardCss,
  },
  modalHeroBackdrop: {
    backgroundColor: pickThemed(colors, "#EAF4FF", colors.card),
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  infoButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 28,
    zIndex: 2,
  },
  heroContent: {
    gap: spacing.sm,
  },
  desktopHeroContent: {
    alignItems: "center",
    flexDirection: "row",
  },
  modalIllustrationWrap: {
    alignSelf: "center",
    height: webGoLinkModalLayout.illustrationMobileHeight,
    maxWidth: 360,
    width: "100%",
  },
  illustration: {
    height: "100%",
    width: "100%",
  },
  formArea: {
    flex: 1,
    gap: webGoLinkModalLayout.inputActionGap,
  },
  title: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 25,
    paddingRight: spacing.xl,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "rgba(255, 255, 255, 0.82)", colors.field),
    borderColor: "rgba(0, 170, 128, 0.35)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: webGoLinkModalLayout.inputHeight,
    // Clip to the radius so the rounded corners don't rasterize "horns" under the focus layer.
    overflow: "hidden",
    paddingHorizontal: spacing.md,
  },
  inputShellError: {
    borderColor: "#EF4444",
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
    minHeight: webGoLinkModalLayout.inputHeight - 2,
    // Web: suppress the orange OS-accent UA focus outline; focus is conveyed by the green border.
    outlineColor: "transparent",
    outlineWidth: 0,
  },
  inputShellFocused: {
    borderColor: colors.primary,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: typography.caption,
    fontWeight: typography.bodyWeight,
    marginTop: -spacing.sm,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: webGoLinkModalLayout.actionHeight,
    boxShadow: shadows.cardCss,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
  },
  resultOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 90,
  },
  resultBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  overlayHitArea: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  resultDialog: {
    backgroundColor: colors.card,
    borderRadius: 24,
    maxHeight: 800,
    maxWidth: 640,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: "100%",
    boxShadow: shadows.bottomNavCss,
  },
  resultCloseButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 40,
    zIndex: 2,
  },
  resultScrollerContent: {
    alignItems: "center",
    gap: 16,
    paddingTop: 24,
  },
  resultProductWrap: {
    borderColor: "#F6F6F6",
    borderRadius: 16,
    borderWidth: 1,
    height: 200,
    overflow: "hidden",
    position: "relative",
    width: 200,
  },
  resultProductImage: {
    height: "100%",
    width: "100%",
  },
  resultShopBadge: {
    bottom: 10,
    height: 48,
    position: "absolute",
    right: 10,
    width: 48,
  },
  resultDetails: {
    alignSelf: "stretch",
    gap: spacing.xs,
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 25,
    paddingRight: 32,
  },
  resultHost: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  resultPriceRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.xs,
  },
  resultPriceAmount: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 29,
  },
  resultPriceCurrency: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  resultCashbackBox: {
    alignSelf: "stretch",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  resultCashbackLine: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  resultCashbackText: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  resultTermsButton: {
    alignItems: "center",
    backgroundColor: "#D8F8EF",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  resultTermsLabel: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
  },
  resultTermsText: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: typography.caption,
  },
  resultDisclaimer: {
    alignSelf: "stretch",
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  successBar: {
    alignItems: "center",
    backgroundColor: "#052F5F",
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 347,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    width: "100%",
  },
  successText: {
    color: colors.white,
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
  },
  successDismissButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  shopNowButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 180,
    paddingHorizontal: spacing.lg,
  },
  shopNowText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "800",
  },
  termsScrollerContent: {
    gap: spacing.md,
    paddingTop: 8,
  },
  termsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  termsBackButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  termsBackText: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 30,
  },
  termsTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 27,
  },
  termsList: {
    gap: spacing.sm,
  },
  termsItem: {
    backgroundColor: colors.card,
    borderBottomColor: "#B7E7DB",
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    boxShadow: shadows.cardCss,
  },
  termsItemHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  termsHelpDot: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#EAF4FF", colors.card),
    borderRadius: radii.chip,
    height: 21,
    justifyContent: "center",
    width: 21,
  },
  termsHelpText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  termsItemTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "500",
  },
  termsItemBody: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 19,
    paddingLeft: 29,
  },
  cashbackTipsBlock: {
    backgroundColor: pickThemed(colors, "#F0FDFA", colors.primarySoft),
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cashbackTipsTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: "700",
  },
  cashbackTipsText: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    boxShadow: shadows.cardCss,
  },
  offscreenGuideCard: {
    left: 12,
    position: "absolute",
    right: 12,
    top: 9999,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: "700",
  },
  stepRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  stepBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.chip,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  stepBadgeText: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  stepText: {
    color: colors.ink,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "700",
  },
  guidelineOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 80,
  },
  guidelineBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  guidelineDialog: {
    backgroundColor: colors.card,
    borderRadius: 24,
    maxHeight: 720,
    maxWidth: 560,
    overflow: "hidden",
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 56,
    width: "100%",
    boxShadow: shadows.bottomNavCss,
  },
  guidelineCloseButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 40,
    zIndex: 2,
  },
  guidelineFlowWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    minHeight: 90,
    width: "100%",
  },
  guidelineCopyBlock: {
    gap: 4,
  },
  guidelineTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 27,
  },
  guidelineSubtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  guidelineStepList: {
    marginTop: 24,
  },
  guidelineStepRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingVertical: 8,
  },
  guidelineMiddleStepRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  guidelineStepThumb: {
    borderRadius: 12,
    height: 96,
    overflow: "hidden",
    width: 96,
  },
  guidelineStepText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
}

