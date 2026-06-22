import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import linkGoGoCashImage from "../../assets/link-mycashback-gogocash.png";
import linkMyCashbackImage from "../../assets/link-mycashback-shop.png";
import logoMarkImage from "../../assets/nav/logo.png";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopHeader } from "@mobile/components/CustomerDesktopHeader";
import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";
import { LinkMyCashbackConnectorDots } from "@mobile/components/LinkMyCashbackConnectorDots";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { haptics } from "@mobile/lib/haptics";
import {
  getDesktopShellHorizontalPadding,
  mobileShellLayout,
  webLinkMyCashbackIntro,
} from "@mobile/design/webDesignParity";
import { Check, CheckCircle } from "@mobile/theme/icons";
import { motion } from "@mobile/theme/motion";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

// Mirrors the web LinkMyCashback copy (web link-mycashback/constants.ts). Mock OTP is 123456.
const LINK_VERIFY_OTP = "123456";
const RESEND_COUNTDOWN_SECONDS = 60;

const linkCopy = {
  methodTitle: "Select Your Preferred Linking Method",
  methodDescription:
    "Please select 'Email' or 'Phone Number' as registered with MyCashBack to ensure your account is linked correctly.",
  phoneLabel: "Phone Number",
  emailLabel: "Email",
  phonePlaceholder: "Phone Number",
  emailPlaceholder: "Email",
  consentPrefix: "I consent to share my MyCashBack information. ",
  privacyPolicyLabel: "Privacy Policy",
  back: "Back",
  next: "Next",
  verifyTitle: "Verification Code",
  verifyDescriptionPhone:
    "A verification code will be sent to your mobile number to confirm this action is being performed by you.",
  verifyDescriptionEmail:
    "A verification code will be sent to your email address to confirm this action is being performed by you.",
  verifySentToPhone: "Code is sent to phone number :",
  verifySentToEmail: "Code is sent to email :",
  verifyResend: "Resend ?",
  verifyOtpAria: "Verification code",
  verifyInvalidOtp: "That code doesn’t match. Check the code and try again.",
  successTitle: "Verification successful",
  successDescription:
    "Your contact details have been confirmed. Continue to finish linking your MyCashBack account.",
  successContinue: "Continue",
  successEditCode: "Change code",
} as const;

// Web-only smoothing + green focus ring for the OTP cells (instant on native).
const webOtpCellMotionStyle = {
  transitionDuration: motion.cssTransition.duration,
  transitionProperty: "transform, border-color, box-shadow, background-color",
  transitionTimingFunction: motion.cssTransition.timingFunction,
} as unknown as ViewStyle;

const webOtpCellActiveGlowStyle = {
  boxShadow: "0 0 0 4px rgba(86, 212, 170, 0.18), 0 6px 16px rgba(0, 204, 153, 0.18)",
} as unknown as ViewStyle;

type LinkChannel = "phone" | "email";
type LinkStep = "method" | "verify" | "success";

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function maskEmailForDisplay(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) {
    return "****";
  }
  return `${trimmed.slice(0, 1)}***${trimmed.slice(atIndex)}`;
}

function LinkOtpBoxes({
  hasError,
  onChangeText,
  value,
}: {
  hasError: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  const styles = useThemedStyles(createMyCashbackSignInScreenStyles);
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const otpDigits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");
  const activeIndex = isFocused && value.length < otpDigits.length ? value.length : -1;

  return (
    <View style={styles.otpWrap}>
      <TextInput
        accessibilityLabel={linkCopy.verifyOtpAria}
        keyboardType="number-pad"
        maxLength={6}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        returnKeyType="done"
        style={styles.otpHiddenInput}
        value={value}
      />
      <View style={styles.otpRow}>
        {otpDigits.map((digit, index) => {
          const isFilled = index < value.length;
          const isActive = index === activeIndex;
          return (
            <View
              key={index}
              style={[
                styles.otpCell,
                webOtpCellMotionStyle,
                isFilled ? styles.otpCellFilled : null,
                isActive && !hasError ? styles.otpCellActive : null,
                isActive && !hasError ? webOtpCellActiveGlowStyle : null,
                hasError ? styles.otpCellError : null,
              ]}
            >
              <Text style={styles.otpCellText}>{digit}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function CustomerMyCashbackSignInScreen() {
  const styles = useThemedStyles(createMyCashbackSignInScreenStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const shellPadding = isDesktop
    ? getDesktopShellHorizontalPadding(width)
    : mobileShellLayout.contentHorizontalPadding;

  const [linkStep, setLinkStep] = useState<LinkStep>("method");
  const [linkChannel, setLinkChannel] = useState<LinkChannel>("phone");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [emailValue, setEmailValue] = useState("");
  // Swap the resting border for a brand-green focus ring (and suppress the orange OS-accent UA
  // outline). One flag suffices: the phone and email inputs are mutually exclusive.
  const [isInputFocused, setInputFocused] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const phoneDigits = phoneLocal.replace(/\D/g, "");
  const otpDigits = otpInput.replace(/\D/g, "");
  const canSubmitMethod =
    consentChecked &&
    (linkChannel === "phone" ? phoneDigits.length >= 9 : emailValue.trim().length > 0);
  const canSubmitOtp = otpDigits.length === 6;

  useEffect(() => {
    if (linkStep !== "verify" || resendSeconds <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [linkStep, resendSeconds]);

  const goToVerify = () => {
    if (!canSubmitMethod) {
      return;
    }
    setOtpInput("");
    setOtpError(false);
    setResendSeconds(RESEND_COUNTDOWN_SECONDS);
    setLinkStep("verify");
  };

  const handleOtpChange = (next: string) => {
    setOtpInput(next.replace(/\D/g, "").slice(0, 6));
    setOtpError(false);
  };

  const handleResend = () => {
    if (resendSeconds > 0) {
      return;
    }
    setOtpInput("");
    setOtpError(false);
    setResendSeconds(RESEND_COUNTDOWN_SECONDS);
  };

  const handleVerifySubmit = () => {
    if (!canSubmitOtp) {
      return;
    }
    if (otpDigits === LINK_VERIFY_OTP) {
      // B1: confirm a successful link/sign-in with a success haptic (no-op on web).
      void haptics.success();
      setLinkStep("success");
      return;
    }
    // B1: signal the failed verification with an error haptic.
    void haptics.error();
    setOtpError(true);
  };

  const maskedDestination =
    linkChannel === "phone"
      ? phoneDigits.length >= 4
        ? `***${phoneDigits.slice(-4)}`
        : "****"
      : maskEmailForDisplay(emailValue);

  return (
    <View style={styles.viewport}>
      <View style={[styles.shell, isDesktop ? styles.desktopShell : styles.phoneFrame]}>
        {isDesktop ? <CustomerDesktopHeader viewportWidth={width} /> : null}
        {/* B1: KeyboardAwareScreen keeps the soft keyboard from covering the
            phone/email/OTP inputs on native; layout no-op on web. */}
        <KeyboardAwareScreen
          contentContainerStyle={[styles.page, isDesktop ? styles.pageDesktop : styles.pageMobile]}
        >
          <View
            accessibilityLabel="Link MyCashback with GoGoCash"
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
            <View style={styles.introContent}>
              <Image
                alt="GoGoCash"
                accessibilityIgnoresInvertColors
                accessibilityLabel="GoGoCash"
                source={logoMarkImage}
                style={styles.logoMark}
              />
              <Text style={styles.title}>{webLinkMyCashbackIntro.title}</Text>
              <Text style={styles.subtitle}>{webLinkMyCashbackIntro.subtitle}</Text>

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

              {linkStep === "method" ? (
                <View style={styles.stepBody}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepTitle}>{linkCopy.methodTitle}</Text>
                    <Text style={styles.stepDescription}>{linkCopy.methodDescription}</Text>
                  </View>

                  <View style={styles.radioRow}>
                    {(
                      [
                        { value: "phone", label: linkCopy.phoneLabel },
                        { value: "email", label: linkCopy.emailLabel },
                      ] as const
                    ).map((option) => {
                      const selected = linkChannel === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          onPress={() => {
                            setLinkChannel(option.value);
                            setInputFocused(false);
                          }}
                          style={styles.radioOption}
                        >
                          <View
                            style={[styles.radioOuter, selected ? styles.radioOuterActive : null]}
                          >
                            {selected ? <View style={styles.radioInner} /> : null}
                          </View>
                          <Text style={styles.radioLabel}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {linkChannel === "phone" ? (
                    <View style={styles.phoneRow}>
                      <View style={styles.phonePrefix}>
                        <Text style={styles.phonePrefixText}>+66</Text>
                      </View>
                      <TextInput
                        autoComplete="tel"
                        inputMode="numeric"
                        keyboardType="number-pad"
                        maxLength={10}
                        onBlur={() => setInputFocused(false)}
                        onChangeText={(value) =>
                          setPhoneLocal(value.replace(/\D/g, "").slice(0, 10))
                        }
                        onFocus={() => setInputFocused(true)}
                        placeholder={linkCopy.phonePlaceholder}
                        placeholderTextColor="#7F7F7F"
                        style={[styles.input, styles.inputFlex, isInputFocused ? styles.inputFocused : null]}
                        value={phoneLocal}
                      />
                    </View>
                  ) : (
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      inputMode="email"
                      keyboardType="email-address"
                      onBlur={() => setInputFocused(false)}
                      onChangeText={setEmailValue}
                      onFocus={() => setInputFocused(true)}
                      placeholder={linkCopy.emailPlaceholder}
                      placeholderTextColor="#7F7F7F"
                      style={[styles.input, styles.inputFull, isInputFocused ? styles.inputFocused : null]}
                      value={emailValue}
                    />
                  )}

                  <Pressable
                    accessibilityLabel={linkCopy.consentPrefix + linkCopy.privacyPolicyLabel}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: consentChecked }}
                    onPress={() => setConsentChecked((value) => !value)}
                    style={styles.consentRow}
                  >
                    <View
                      style={[
                        styles.consentCheckbox,
                        consentChecked ? styles.consentCheckboxChecked : null,
                      ]}
                    >
                      {consentChecked ? <Check color={colors.white} size={13} weight="bold" /> : null}
                    </View>
                    <Text style={styles.consentText}>
                      {linkCopy.consentPrefix}
                      <Text style={styles.consentLink}>{linkCopy.privacyPolicyLabel}</Text>
                    </Text>
                  </Pressable>

                  <View style={styles.actionRow}>
                    <MotionPressable
                      accessibilityLabel={linkCopy.back}
                      accessibilityRole="button"
                      hoverLift={false}
                      onPress={() => router.push("/link-mycashback")}
                      pressScale={motion.scale.subtlePress}
                      style={StyleSheet.flatten([styles.actionButton, styles.backButton])}
                    >
                      <Text style={[styles.actionButtonText, styles.backButtonText]}>
                        {linkCopy.back}
                      </Text>
                    </MotionPressable>
                    <MotionPressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canSubmitMethod }}
                      disabled={!canSubmitMethod}
                      hoverLift={false}
                      onPress={goToVerify}
                      pressScale={motion.scale.subtlePress}
                      style={StyleSheet.flatten([
                        styles.actionButton,
                        canSubmitMethod ? styles.nextButton : styles.nextButtonDisabled,
                      ])}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          canSubmitMethod ? styles.nextButtonText : styles.nextButtonTextDisabled,
                        ]}
                      >
                        {linkCopy.next}
                      </Text>
                    </MotionPressable>
                  </View>
                </View>
              ) : linkStep === "verify" ? (
                <View style={styles.stepBody}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepTitle}>{linkCopy.verifyTitle}</Text>
                    <Text style={styles.stepDescription}>
                      {linkChannel === "phone"
                        ? linkCopy.verifyDescriptionPhone
                        : linkCopy.verifyDescriptionEmail}
                    </Text>
                    <View style={styles.sentRow}>
                      <Text style={styles.sentLabel}>
                        {linkChannel === "phone"
                          ? linkCopy.verifySentToPhone
                          : linkCopy.verifySentToEmail}
                      </Text>
                      <Text style={styles.sentDestination}>{maskedDestination}</Text>
                    </View>
                  </View>

                  <LinkOtpBoxes
                    hasError={otpError}
                    onChangeText={handleOtpChange}
                    value={otpInput}
                  />
                  {otpError ? (
                    <Text accessibilityRole="alert" style={styles.otpErrorText}>
                      {linkCopy.verifyInvalidOtp}
                    </Text>
                  ) : null}

                  <View style={styles.resendRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: resendSeconds > 0 }}
                      disabled={resendSeconds > 0}
                      onPress={handleResend}
                    >
                      <Text
                        style={[
                          styles.resendText,
                          resendSeconds > 0 ? styles.resendTextDisabled : null,
                        ]}
                      >
                        {linkCopy.verifyResend}
                      </Text>
                    </Pressable>
                    <Text style={styles.resendCountdown}>{formatCountdown(resendSeconds)}</Text>
                  </View>

                  <View style={styles.actionRow}>
                    <MotionPressable
                      accessibilityLabel={linkCopy.back}
                      accessibilityRole="button"
                      hoverLift={false}
                      onPress={() => {
                        setLinkStep("method");
                        setOtpInput("");
                        setOtpError(false);
                      }}
                      pressScale={motion.scale.subtlePress}
                      style={StyleSheet.flatten([styles.actionButton, styles.backButton])}
                    >
                      <Text style={[styles.actionButtonText, styles.backButtonText]}>
                        {linkCopy.back}
                      </Text>
                    </MotionPressable>
                    <MotionPressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canSubmitOtp }}
                      disabled={!canSubmitOtp}
                      hoverLift={false}
                      onPress={handleVerifySubmit}
                      pressScale={motion.scale.subtlePress}
                      style={StyleSheet.flatten([
                        styles.actionButton,
                        canSubmitOtp ? styles.nextButton : styles.nextButtonDisabled,
                      ])}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          canSubmitOtp ? styles.nextButtonText : styles.nextButtonTextDisabled,
                        ]}
                      >
                        {linkCopy.next}
                      </Text>
                    </MotionPressable>
                  </View>
                </View>
              ) : (
                <View style={styles.successBody}>
                  <CheckCircle color={colors.primary} size={64} weight="fill" />
                  <Text style={styles.successTitle}>{linkCopy.successTitle}</Text>
                  <Text style={styles.successDescription}>{linkCopy.successDescription}</Text>
                  <View style={styles.successActions}>
                    <MotionPressable
                      accessibilityRole="button"
                      hoverLift={false}
                      onPress={() => router.push("/account-setup")}
                      pressScale={motion.scale.subtlePress}
                      style={styles.successContinueButton}
                    >
                      <Text style={styles.successContinueText}>{linkCopy.successContinue}</Text>
                    </MotionPressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setLinkStep("verify");
                        setOtpInput("");
                        setOtpError(false);
                      }}
                    >
                      <Text style={styles.successEditCodeText}>{linkCopy.successEditCode}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
          {isDesktop ? (
            <View style={styles.desktopFooter}>
              <CustomerDesktopFooter horizontalPadding={0} viewportWidth={width} />
            </View>
          ) : null}
        </KeyboardAwareScreen>
      </View>
    </View>
  );
}

function createMyCashbackSignInScreenStyles(colors: ThemeColors) {
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
    backgroundColor: webLinkMyCashbackIntro.backgroundColor,
  },
  heroBand: {
    alignItems: "center",
    backgroundColor: webLinkMyCashbackIntro.backgroundColor,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 620,
    width: "100%",
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
    color: "#4F6C78",
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
  stepBody: {
    gap: 20,
    marginTop: 36,
    width: "100%",
  },
  stepHeader: {
    gap: 4,
    width: "100%",
  },
  stepTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  stepDescription: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  radioRow: {
    columnGap: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    width: "100%",
  },
  radioOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 28,
  },
  radioOuter: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: "#989898",
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  radioOuterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radioInner: {
    backgroundColor: colors.card,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  radioLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "400",
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  phonePrefix: {
    alignItems: "center",
    borderColor: "rgba(169, 169, 169, 0.5)",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 16,
  },
  phonePrefixText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    minHeight: 56,
    // Web: suppress the orange OS-accent UA focus outline; focus is conveyed by the green border.
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputFlex: {
    flex: 1,
    minWidth: 0,
  },
  inputFull: {
    width: "100%",
  },
  consentRow: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: "100%",
  },
  consentCheckbox: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: "#D0D5DD",
    borderRadius: 6,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  consentCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentText: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 13,
    lineHeight: 18,
  },
  consentLink: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "700",
  },
  sentRow: {
    alignItems: "center",
    columnGap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    rowGap: 2,
  },
  sentLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 20,
  },
  sentDestination: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    lineHeight: 20,
  },
  otpWrap: {
    height: 56,
    position: "relative",
    width: "100%",
  },
  otpHiddenInput: {
    bottom: 0,
    color: "transparent",
    left: 0,
    opacity: 0.02,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  otpRow: {
    flexDirection: "row",
    gap: 8,
    height: 56,
    pointerEvents: "none",
    width: "100%",
  },
  otpCell: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
  },
  otpCellFilled: {
    borderColor: colors.primary,
  },
  otpCellActive: {
    borderColor: "#56D4AA",
    borderWidth: 2,
  },
  otpCellError: {
    borderColor: colors.danger,
  },
  otpCellText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "800",
  },
  otpErrorText: {
    color: colors.danger,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
  resendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
  },
  resendText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  resendTextDisabled: {
    opacity: 0.5,
    textDecorationLine: "none",
  },
  resendCountdown: {
    color: colors.link,
    fontFamily: typography.family,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  actionRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    marginTop: 4,
    width: "100%",
  },
  actionButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    width: 144,
  },
  actionButtonText: {
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  backButton: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  backButtonText: {
    color: colors.primary,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  nextButtonDisabled: {
    backgroundColor: colors.background,
  },
  nextButtonText: {
    color: colors.white,
  },
  nextButtonTextDisabled: {
    color: colors.textSoft,
  },
  successBody: {
    alignItems: "center",
    gap: 16,
    marginTop: 36,
    width: "100%",
  },
  successTitle: {
    color: pickThemed(colors, "#103522", colors.accent),
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    textAlign: "center",
  },
  successDescription: {
    color: "#5B6B61",
    fontFamily: typography.family,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 400,
    textAlign: "center",
  },
  successActions: {
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    width: "100%",
  },
  successContinueButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    justifyContent: "center",
    maxWidth: 280,
    minHeight: 48,
    paddingHorizontal: 24,
    width: "100%",
  },
  successContinueText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "800",
  },
  successEditCodeText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  desktopFooter: {
    backgroundColor: colors.card,
  },
});
}

