import { Link, useRouter } from "expo-router";
import { useCopy } from "@mobile/i18n/useCopy";
import { Check, ChevronDown as ChevronDownIcon } from "@mobile/theme/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import authHeroImage from "../../assets/auth-login-hero.png";
import logoMarkImage from "../../assets/nav/logo.png";
import { CustomerCookieConsentBanner } from "@mobile/components/CustomerCookieConsentBanner";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopHeader } from "@mobile/components/CustomerDesktopHeader";
import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import { haptics } from "@mobile/lib/haptics";
import { markIntroModalPending } from "@mobile/features/introModal/introModalSession";
import {
  getDesktopShellHorizontalPadding,
  mobileShellLayout,
  webAuthPage,
} from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import { colors, radii, typography } from "@mobile/theme/tokens";

// Premium polish for the consent checkbox checked state (web-only smoothing + brand-green glow).
const webConsentCheckboxMotionStyle = {
  transitionDuration: motion.cssTransition.duration,
  transitionProperty: "background-color, border-color, box-shadow",
  transitionTimingFunction: motion.cssTransition.timingFunction,
} as unknown as ViewStyle;

const webConsentCheckboxGlowStyle = {
  boxShadow: "0 4px 12px rgba(0, 204, 153, 0.45)",
} as unknown as ViewStyle;

// Premium OTP cell motion + focus ring (web-only smoothing; native shows the states instantly).
const webOtpBoxMotionStyle = {
  transitionDuration: motion.cssTransition.duration,
  transitionProperty: "transform, border-color, box-shadow, background-color",
  transitionTimingFunction: motion.cssTransition.timingFunction,
} as unknown as ViewStyle;

const webOtpBoxActiveGlowStyle = {
  boxShadow: "0 0 0 4px rgba(86, 212, 170, 0.18), 0 6px 16px rgba(0, 204, 153, 0.18)",
} as unknown as ViewStyle;

// Faint resting elevation so the social provider cards feel like they float.
const webSocialButtonRestStyle = {
  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
} as unknown as ViewStyle;

// Floating country dropdown — soft elevation so the menu reads as an overlay above the form.
const webCountryMenuShadowStyle = {
  boxShadow: "0 16px 40px rgba(16, 24, 40, 0.18)",
} as unknown as ViewStyle;

type AuthPhase = "phone" | "otp";
type SocialProvider = (typeof webAuthPage.socialProviders)[number];
type AuthCountry = (typeof webAuthPage.countries)[number];

export function CustomerAuthScreen({ mode }: { mode: "login" | "register" }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  // A1 — when reduce-motion is on, the screen-local Animated timelines (consent
  // checkmark, country menu) snap to their end state instantly (duration 0) instead
  // of easing. MotionPressable already handles its own press-feedback reduction.
  const reducedMotion = useReducedMotion();
  const [authPhase, setAuthPhase] = useState<AuthPhase>("phone");
  const [otpError, setOtpError] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<AuthCountry>(webAuthPage.countries[0]);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const countryWrapRef = useRef<View>(null);
  const consentCheckProgress = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(consentCheckProgress, {
      duration: reducedMotion
        ? 0
        : privacyAccepted
          ? motion.duration.base
          : motion.duration.fast,
      easing: privacyAccepted ? motion.easing.spring : motion.easing.in,
      toValue: privacyAccepted ? 1 : 0,
      useNativeDriver: motion.useNativeDriver,
    }).start();
  }, [consentCheckProgress, privacyAccepted, reducedMotion]);
  const consentCheckmarkMotion = {
    opacity: consentCheckProgress,
    transform: [
      { scale: consentCheckProgress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
    ],
  };
  // Premium country dropdown: one progress value rotates the caret AND fades/slides/settles the
  // menu, so the trigger and panel can never desync. Spring easing on open gives a subtle bounce.
  const countryMenuProgress = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(countryMenuProgress, {
      duration: reducedMotion
        ? 0
        : countryMenuOpen
          ? motion.duration.base
          : motion.duration.fast,
      easing: countryMenuOpen ? motion.easing.spring : motion.easing.in,
      toValue: countryMenuOpen ? 1 : 0,
      useNativeDriver: motion.useNativeDriver,
    }).start();
  }, [countryMenuOpen, countryMenuProgress, reducedMotion]);
  const countryCaretRotate = countryMenuProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const countryMenuMotion = {
    opacity: countryMenuProgress,
    transform: [
      { translateY: countryMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
      { scale: countryMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
    ],
  };
  // Dismiss the country menu on outside-click or Escape. These are web-only document listeners
  // (the app runs on Expo web); native relies on the trigger toggle + select-to-close. The
  // pointerdown is captured so an outside click closes the menu before it lands on a field.
  useEffect(() => {
    if (Platform.OS !== "web" || !countryMenuOpen) {
      return undefined;
    }
    const onPointerDown = (event: Event) => {
      const node = countryWrapRef.current as unknown as HTMLElement | null;
      if (node && event.target instanceof Node && !node.contains(event.target)) {
        setCountryMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCountryMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [countryMenuOpen]);
  const isDesktopShell = width >= mobileShellLayout.desktopBreakpoint;
  const isWideDesktop = width >= 1280;
  // Match the auth content to the header's content box (row max width minus the same gutters) so
  // the hero/form never extend past the navbar's logo and actions.
  const desktopContentWidth =
    mobileShellLayout.desktopContentMaxWidth - 2 * getDesktopShellHorizontalPadding(width);
  // i18n: all auth copy resolves through useCopy — a reverse-lookup into the reused web ICU catalogs
  // that falls back to the webDesignParity English when no catalog key matches the string.
  const tc = useCopy();
  const title = tc(webAuthPage.titleByMode[mode]);
  const phoneDigits = phoneLocal.replace(/\D/g, "");
  const canSubmitPhone = privacyAccepted && phoneDigits.length >= 9;
  const dividerText = webAuthPage.socialDividerByMode[mode];
  const primarySocialProviders = webAuthPage.socialProviders.slice(0, 4);
  const secondarySocialProviders = webAuthPage.socialProviders.slice(4);
  const maskedPhone = useMemo(() => {
    if (!phoneDigits) {
      return selectedCountry.dialCode;
    }

    if (phoneDigits.length <= 4) {
      return `${selectedCountry.dialCode} ${phoneDigits}`;
    }

    return `${selectedCountry.dialCode} ${"*".repeat(
      Math.max(2, phoneDigits.length - 4)
    )}${phoneDigits.slice(-4)}`;
  }, [phoneDigits, selectedCountry.dialCode]);

  const handlePhoneChange = (nextValue: string) => {
    setPhoneLocal(nextValue.replace(/\D/g, "").slice(0, 10));
  };

  const handlePhoneSubmit = () => {
    if (!canSubmitPhone) {
      return;
    }

    setAuthPhase("otp");
    setOtpInput("");
    setOtpError(false);
  };

  const handleChangePhone = () => {
    setAuthPhase("phone");
    setOtpInput("");
    setOtpError(false);
  };

  const handleOtpChange = (nextValue: string) => {
    const nextDigits = nextValue.replace(/\D/g, "").slice(0, 6);
    const isInvalidFullCode = nextDigits.length === 6 && nextDigits !== "123456";

    // Light tap as each digit lands; an error buzz the moment a full code is wrong.
    if (nextDigits.length > otpInput.length) {
      haptics.impact();
    }
    if (isInvalidFullCode) {
      haptics.error();
    }

    setOtpInput(nextDigits);
    setOtpError(isInvalidFullCode);
  };

  const handleOtpSubmit = () => {
    const isValid = otpInput.length === 6 && otpInput === "123456";
    setOtpError(!isValid);
    if (isValid) {
      // Success haptic on a verified sign-in, then mirror the web post-login flow:
      // queue the first-visit intro modal (shown when home mounts), then land on the
      // MyCashback linking step.
      haptics.success();
      markIntroModalPending();
      router.push("/link-mycashback");
    } else {
      haptics.error();
    }
  };

  return (
    <View style={styles.viewport}>
      <View style={[styles.shell, isDesktopShell ? styles.desktopShell : styles.phoneFrame]}>
        {isDesktopShell ? <CustomerDesktopHeader viewportWidth={width} /> : null}
        {/* A4 — KeyboardAwareScreen wraps the phone/OTP form so the on-screen keyboard
            never covers the focused field (the #1 bug-hunt finding). It supplies the
            keyboard-avoiding ScrollView and forwards contentContainerStyle, so the
            existing page padding/layout is unchanged; on web it is a layout no-op. */}
        <KeyboardAwareScreen
          contentContainerStyle={[
            styles.page,
            isDesktopShell ? styles.pageDesktop : styles.pageMobile,
            !isDesktopShell ? styles.pageAuthMobile : null,
            {
              paddingTop: isDesktopShell ? 80 : Math.max(64, insets.top + 40),
            },
          ]}
        >
          <View
            style={[
              styles.authLayout,
              isWideDesktop ? styles.authLayoutDesktop : null,
              isDesktopShell ? { maxWidth: desktopContentWidth } : null,
            ]}
          >
            {isWideDesktop ? (
              <View style={styles.heroFrame}>
                <Image
                  alt={webAuthPage.heroAlt}
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={webAuthPage.heroAlt}
                  resizeMode="cover"
                  source={authHeroImage}
                  style={styles.heroImage}
                />
              </View>
            ) : null}

            <View
              accessibilityLabel={`${title} form`}
              style={[styles.card, isWideDesktop ? styles.cardDesktop : styles.cardStacked]}
              testID="auth-card"
            >
              <View style={[styles.cardInner, !isDesktopShell ? styles.cardInnerMobile : null]}>
                <View style={[styles.brandBlock, !isDesktopShell ? styles.brandBlockMobile : null]}>
                  <Image
                    alt="GoGoCash logo"
                    accessibilityLabel="GoGoCash logo"
                    source={logoMarkImage}
                    style={[styles.formLogo, !isDesktopShell ? styles.formLogoMobile : null]}
                  />
                  <Text style={styles.formTitle}>{title}</Text>
                  <Text style={styles.formSubtitle}>{tc(webAuthPage.subtitle)}</Text>
                </View>

                {authPhase === "phone" ? (
                  <View style={[styles.formStack, !isDesktopShell ? styles.formStackMobile : null]}>
                    {countryMenuOpen && Platform.OS !== "web" ? (
                      <Pressable
                        accessibilityLabel="Close country menu"
                        accessibilityRole="button"
                        onPress={() => setCountryMenuOpen(false)}
                        style={styles.countryMenuBackdrop}
                      />
                    ) : null}
                    <View
                      style={[styles.countryRow, !isDesktopShell ? styles.countryRowMobile : null]}
                    >
                      <Text style={styles.fieldLabel}>{tc(webAuthPage.selectCountryLabel)}</Text>
                      <View
                        ref={countryWrapRef}
                        style={[
                          styles.countrySelectWrap,
                          !isDesktopShell ? styles.countrySelectWrapMobile : null,
                        ]}
                      >
                        <MotionPressable
                          accessibilityLabel={webAuthPage.countryPlaceholder}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: countryMenuOpen }}
                          hoverLift={false}
                          onPress={() => setCountryMenuOpen((open) => !open)}
                          pressScale={motion.scale.subtlePress}
                          style={[
                            styles.countrySelect,
                            !isDesktopShell ? styles.countrySelectMobile : null,
                            countryMenuOpen ? styles.countrySelectOpen : null,
                          ]}
                        >
                          <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                          <Text style={styles.countryText}>{selectedCountry.label}</Text>
                          <Animated.View style={{ transform: [{ rotate: countryCaretRotate }] }}>
                            <ChevronDownIcon color="#2B6454" size={16} strokeWidth={2} />
                          </Animated.View>
                        </MotionPressable>
                        {countryMenuOpen ? (
                          <Animated.View
                            accessibilityRole="menu"
                            style={[styles.countryMenu, webCountryMenuShadowStyle, countryMenuMotion]}
                          >
                            {webAuthPage.countries.map((country) => {
                              const isSelected = country.code === selectedCountry.code;
                              return (
                                <MotionPressable
                                  accessibilityLabel={`${country.label} ${country.dialCode}`}
                                  accessibilityRole="menuitem"
                                  accessibilityState={{ selected: isSelected }}
                                  hoverLift={false}
                                  key={country.code}
                                  onPress={() => {
                                    setSelectedCountry(country);
                                    setCountryMenuOpen(false);
                                  }}
                                  pressScale={motion.scale.subtlePress}
                                  style={[
                                    styles.countryMenuItem,
                                    isSelected ? styles.countryMenuItemSelected : null,
                                  ]}
                                >
                                  <Text style={styles.countryMenuFlag}>{country.flag}</Text>
                                  <Text style={styles.countryMenuLabel}>{country.label}</Text>
                                  <Text style={styles.countryMenuDial}>{country.dialCode}</Text>
                                  {isSelected ? (
                                    <Check color="#0E9F6E" size={16} weight="bold" />
                                  ) : (
                                    <View style={styles.countryMenuCheckSpacer} />
                                  )}
                                </MotionPressable>
                              );
                            })}
                          </Animated.View>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>{tc(webAuthPage.phoneLabelByMode[mode])}</Text>
                      <View style={styles.phoneRow}>
                        <View style={styles.dialCodeBox}>
                          <Text style={styles.dialCodeText}>
                            {selectedCountry.dialCode}
                          </Text>
                        </View>
                        <TextInput
                          accessibilityLabel={tc(webAuthPage.phonePlaceholder)}
                          autoComplete="tel"
                          keyboardType="phone-pad"
                          onChangeText={handlePhoneChange}
                          onSubmitEditing={handlePhoneSubmit}
                          placeholder={tc(webAuthPage.phonePlaceholder)}
                          placeholderTextColor="#B9B9B9"
                          returnKeyType="done"
                          style={styles.phoneInput}
                          value={phoneLocal}
                        />
                      </View>
                    </View>

                    <MotionPressable
                      accessibilityLabel={webAuthPage.privacyLead}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: privacyAccepted }}
                      hoverLift={false}
                      onPress={() => setPrivacyAccepted((accepted) => !accepted)}
                      pressScale={motion.scale.subtlePress}
                      style={[styles.privacyWrap, !isDesktopShell ? styles.privacyWrapMobile : null]}
                    >
                      <View style={styles.checkboxHitArea}>
                        <View
                          style={[
                            styles.checkbox,
                            webConsentCheckboxMotionStyle,
                            privacyAccepted ? styles.checkboxChecked : null,
                            privacyAccepted ? webConsentCheckboxGlowStyle : null,
                          ]}
                        >
                          <Animated.View style={consentCheckmarkMotion}>
                            <Check color={colors.white} size={14} weight="bold" />
                          </Animated.View>
                        </View>
                      </View>
                      <Text style={styles.privacyText}>{tc(webAuthPage.privacyLead)} </Text>
                      <Link asChild href="/privacy-policy">
                        <Pressable onPress={(event) => event.stopPropagation()}>
                          <Text style={styles.privacyLink}>{tc(webAuthPage.privacyPolicyLabel)}</Text>
                        </Pressable>
                      </Link>
                    </MotionPressable>

                    <MotionPressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canSubmitPhone }}
                      disabled={!canSubmitPhone}
                      hoverLift={false}
                      onPress={handlePhoneSubmit}
                      pressScale={motion.scale.subtlePress}
                      style={[
                        styles.primaryAction,
                        !isDesktopShell ? styles.primaryActionMobile : null,
                        !canSubmitPhone ? styles.primaryActionDisabled : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.primaryActionText,
                          !canSubmitPhone ? styles.primaryActionTextDisabled : null,
                        ]}
                      >
                        {title}
                      </Text>
                    </MotionPressable>
                  </View>
                ) : (
                  <View style={styles.otpStack}>
                    <Text style={styles.otpIntro}>{tc(webAuthPage.otp.intro)}</Text>
                    <View style={styles.otpPhoneRow}>
                      <Text style={styles.otpSentTo}>{webAuthPage.otp.sentTo}</Text>
                      <Text style={styles.otpPhone}>{maskedPhone}</Text>
                    </View>
                    <MotionPressable
                      accessibilityRole="button"
                      hitSlop={8}
                      hoverLift={false}
                      onPress={handleChangePhone}
                      pressScale={motion.scale.subtlePress}
                      style={styles.changePhoneButton}
                    >
                      <Text style={styles.changePhoneText}>{tc(webAuthPage.otp.changeNumber)}</Text>
                    </MotionPressable>
                    <PhoneOtpBoxes
                      hasError={otpError}
                      onChangeText={handleOtpChange}
                      value={otpInput}
                    />
                    {otpError ? (
                      <Text accessibilityRole="alert" style={styles.otpError}>
                        {webAuthPage.otp.errorAria}
                      </Text>
                    ) : null}
                    <View style={styles.resendRow}>
                      <MotionPressable
                        accessibilityRole="button"
                        hitSlop={8}
                        hoverLift={false}
                        onPress={() => {
                          setOtpInput("");
                          setOtpError(false);
                        }}
                        pressScale={motion.scale.subtlePress}
                      >
                        <Text style={styles.resendText}>{tc(webAuthPage.otp.resend)}</Text>
                      </MotionPressable>
                      <Text style={styles.resendCountdown}>00:59</Text>
                    </View>
                    <MotionPressable
                      accessibilityRole="button"
                      hoverLift={false}
                      onPress={handleOtpSubmit}
                      pressScale={motion.scale.subtlePress}
                      style={[
                        styles.primaryAction,
                        !isDesktopShell ? styles.primaryActionMobile : null,
                      ]}
                    >
                      <Text style={styles.primaryActionText}>{tc(webAuthPage.otp.next)}</Text>
                    </MotionPressable>
                  </View>
                )}

                <View
                  style={[styles.socialBlock, !isDesktopShell ? styles.socialBlockMobile : null]}
                >
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text
                      style={[
                        styles.dividerText,
                        !isDesktopShell ? styles.dividerTextMobile : null,
                      ]}
                    >
                      {isDesktopShell ? dividerText : dividerText.toUpperCase()}
                    </Text>
                    <View style={styles.dividerLine} />
                  </View>
                  {isDesktopShell ? (
                    <View style={styles.socialRows}>
                      <View style={styles.socialRow}>
                        {primarySocialProviders.map((provider) => (
                          <SocialProviderButton provider={provider} key={provider.id} />
                        ))}
                      </View>
                      <View style={styles.socialRowSecondary}>
                        {secondarySocialProviders.map((provider) => (
                          <SocialProviderButton provider={provider} key={provider.id} />
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.socialGridMobile}>
                      {webAuthPage.socialProviders.map((provider) => (
                        <SocialProviderButton isMobile provider={provider} key={provider.id} />
                      ))}
                    </View>
                  )}
                </View>

                {!isDesktopShell ? (
                  <Link asChild href={mode === "register" ? "/login" : "/register"}>
                    <Pressable style={styles.modeLink}>
                      <Text style={styles.modeLinkText}>
                        {mode === "register" ? "Already have an account" : "Create new account"}
                      </Text>
                    </Pressable>
                  </Link>
                ) : null}
              </View>
              </View>
            </View>
            {isDesktopShell ? (
              <View style={styles.desktopFooter}>
                <CustomerDesktopFooter horizontalPadding={0} viewportWidth={width} />
              </View>
            ) : null}
          </KeyboardAwareScreen>
        </View>
      <CustomerCookieConsentBanner isDesktop={isDesktopShell} />
    </View>
  );
}

function PhoneOtpBoxes({
  hasError,
  onChangeText,
  value,
}: {
  hasError: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const otpDigits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");
  const activeIndex = isFocused && value.length < otpDigits.length ? value.length : -1;

  return (
    <View style={styles.otpInputWrap}>
      <TextInput
        accessibilityHint={hasError ? webAuthPage.otp.errorAria : undefined}
        accessibilityLabel={webAuthPage.otp.label}
        keyboardType="number-pad"
        maxLength={6}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        returnKeyType="done"
        style={styles.otpHiddenInput}
        value={value}
      />
      <View style={styles.otpBoxRow}>
        {otpDigits.map((digit, index) => {
          const isFilled = index < value.length;
          const isActive = index === activeIndex;
          return (
            <View
              key={index}
              style={[
                styles.otpBox,
                webOtpBoxMotionStyle,
                isFilled ? styles.otpBoxFilled : null,
                isActive && !hasError ? styles.otpBoxActive : null,
                isActive && !hasError ? webOtpBoxActiveGlowStyle : null,
                hasError ? styles.otpBoxError : null,
              ]}
            >
              <Text style={styles.otpBoxText}>{digit}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SocialProviderButton({
  isMobile = false,
  provider,
}: {
  isMobile?: boolean;
  provider: SocialProvider;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <MotionPressable
      accessibilityLabel={provider.label}
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      pressScale={motion.scale.subtlePress}
      style={[
        styles.socialButton,
        webSocialButtonRestStyle,
        isMobile ? styles.socialButtonMobile : null,
        hovered ? styles.socialButtonHovered : null,
      ]}
    >
      <SocialProviderIcon provider={provider} />
      <Text numberOfLines={1} style={styles.socialLabel}>
        {provider.label}
      </Text>
    </MotionPressable>
  );
}

function SocialProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider.id === "facebook") {
    return <FacebookBrandIcon />;
  }

  if (provider.id === "google") {
    return <GoogleBrandIcon />;
  }

  if (provider.id === "telegram") {
    return <TelegramBrandIcon />;
  }

  if (provider.id === "apple") {
    return <AppleBrandIcon />;
  }

  if (provider.id === "x") {
    return <XBrandIcon />;
  }

  if (provider.id === "microsoft") {
    return <MicrosoftBrandIcon />;
  }

  return <WalletConnectBrandIcon />;
}

function FacebookBrandIcon() {
  return (
    <Svg height={24} viewBox="0 0 24 24" width={24}>
      <Path
        d="M24 12C24 17.9897 19.6116 22.9542 13.875 23.8542V15.4688H16.6711L17.2031 12H13.875V9.74906C13.875 8.79984 14.34 7.875 15.8306 7.875H17.3438V4.92188C17.3438 4.92188 15.9703 4.6875 14.6573 4.6875C11.9166 4.6875 10.125 6.34875 10.125 9.35625V12H7.07812V15.4688H10.125V23.8542C4.38844 22.9542 0 17.9897 0 12C0 5.37281 5.37281 0 12 0C18.6272 0 24 5.37281 24 12Z"
        fill="#1877F2"
      />
      <Path
        d="M16.6711 15.4688L17.2031 12H13.875V9.74902C13.875 8.80003 14.3399 7.875 15.8306 7.875H17.3438V4.92188C17.3438 4.92188 15.9705 4.6875 14.6576 4.6875C11.9165 4.6875 10.125 6.34875 10.125 9.35625V12H7.07812V15.4688H10.125V23.8542C10.736 23.95 11.3621 24 12 24C12.6379 24 13.264 23.95 13.875 23.8542V15.4688H16.6711Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function GoogleBrandIcon() {
  return (
    <Svg height={24} viewBox="0 0 24 24" width={24}>
      <Path
        d="M5.31891 14.5066L4.4835 17.6252L1.43011 17.6898C0.517594 15.9973 0 14.0609 0 12.0031C0 10.0132 0.483938 8.13667 1.34175 6.48438H1.34241L4.06078 6.98275L5.25159 9.68481C5.00236 10.4114 4.86652 11.1914 4.86652 12.0031C4.86661 12.8839 5.02617 13.7279 5.31891 14.5066Z"
        fill="#FBBB00"
      />
      <Path
        d="M23.7921 9.75781C23.93 10.4837 24.0018 11.2334 24.0018 11.9996C24.0018 12.8587 23.9115 13.6967 23.7394 14.5051C23.1553 17.2558 21.6289 19.6578 19.5144 21.3576L19.5137 21.3569L16.0898 21.1822L15.6052 18.1572C17.0083 17.3343 18.1048 16.0466 18.6823 14.5051H12.2656V9.75781H18.776H23.7921Z"
        fill="#518EF8"
      />
      <Path
        d="M19.5114 21.3538L19.5121 21.3545C17.4556 23.0074 14.8433 23.9965 11.9996 23.9965C7.42969 23.9965 3.45652 21.4422 1.42969 17.6833L5.31848 14.5C6.33187 17.2046 8.94089 19.1299 11.9996 19.1299C13.3143 19.1299 14.546 18.7745 15.6029 18.154L19.5114 21.3538Z"
        fill="#28B446"
      />
      <Path
        d="M19.6616 2.76262L15.7741 5.94525C14.6803 5.26153 13.3872 4.86656 12.002 4.86656C8.87408 4.86656 6.21627 6.88017 5.25364 9.68175L1.34441 6.48131H1.34375C3.34091 2.63077 7.36419 0 12.002 0C14.9136 0 17.5833 1.03716 19.6616 2.76262Z"
        fill="#F14336"
      />
    </Svg>
  );
}

function TelegramBrandIcon() {
  return (
    <Svg height={24} viewBox="0 0 24 24" width={24}>
      <Defs>
        <LinearGradient id="telegramBrandGradient" x1="12" x2="12" y1="0" y2="24">
          <Stop stopColor="#2AABEE" />
          <Stop offset="1" stopColor="#229ED9" />
        </LinearGradient>
      </Defs>
      <Path
        d="M12 0C8.81812 0 5.76375 1.26506 3.51562 3.51469C1.2652 5.76522 0.000643966 8.81734 0 12C0 15.1813 1.26562 18.2357 3.51562 20.4853C5.76375 22.7349 8.81812 24 12 24C15.1819 24 18.2362 22.7349 20.4844 20.4853C22.7344 18.2357 24 15.1813 24 12C24 8.81869 22.7344 5.76431 20.4844 3.51469C18.2362 1.26506 15.1819 0 12 0Z"
        fill="url(#telegramBrandGradient)"
      />
      <Path
        d="M5.43477 11.876C8.93352 10.352 11.266 9.34723 12.4323 8.86173C15.766 7.47554 16.4579 7.23479 16.9098 7.22663C17.0091 7.22504 17.2304 7.2496 17.3748 7.36632C17.4948 7.46476 17.5285 7.59788 17.5454 7.69135C17.5604 7.78473 17.581 7.99754 17.5641 8.16367C17.3841 10.0612 16.6023 14.6658 16.2048 16.7911C16.0379 17.6904 15.706 17.9919 15.3854 18.0213C14.6879 18.0854 14.1591 17.5608 13.4841 17.1185C12.4285 16.426 11.8323 15.9952 10.8066 15.3196C9.62165 14.5389 10.3904 14.1097 11.0654 13.4084C11.2416 13.2249 14.3129 10.432 14.371 10.1787C14.3785 10.147 14.386 10.0289 14.3148 9.96666C14.2454 9.90423 14.1423 9.9256 14.0673 9.94248C13.9604 9.96648 12.2748 11.0817 9.00477 13.288C8.52665 13.6169 8.09352 13.7772 7.70352 13.7688C7.27602 13.7596 6.45102 13.5265 5.8379 13.3274C5.0879 13.0831 4.48977 12.9539 4.54227 12.539C4.56852 12.323 4.86665 12.1019 5.43477 11.876Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function AppleBrandIcon() {
  return (
    <Svg height={24} viewBox="0 0 24 24" width={24}>
      <Path
        d="M21.2798 18.424C20.932 19.2275 20.5203 19.9672 20.0433 20.6472C19.393 21.5743 18.8606 22.216 18.4503 22.5724C17.8143 23.1573 17.1329 23.4568 16.4031 23.4739C15.8792 23.4739 15.2475 23.3248 14.5121 23.0224C13.7742 22.7214 13.0962 22.5724 12.4762 22.5724C11.826 22.5724 11.1286 22.7214 10.3827 23.0224C9.63565 23.3248 9.03383 23.4824 8.5737 23.498C7.87393 23.5278 7.17643 23.2197 6.4802 22.5724C6.03583 22.1848 5.48002 21.5204 4.81417 20.5791C4.09977 19.5739 3.51244 18.4084 3.05231 17.0795C2.55953 15.6442 2.3125 14.2543 2.3125 12.9087C2.3125 11.3673 2.64556 10.0379 3.31269 8.92385C3.83698 8.029 4.53449 7.32312 5.40747 6.80493C6.28045 6.28674 7.2237 6.02267 8.23951 6.00578C8.79532 6.00578 9.5242 6.1777 10.43 6.51559C11.3332 6.85462 11.9131 7.02655 12.1674 7.02655C12.3575 7.02655 13.0018 6.82552 14.094 6.42473C15.1268 6.05305 15.9985 5.89916 16.7126 5.95978C18.6477 6.11595 20.1015 6.87876 21.0683 8.25303C19.3377 9.30163 18.4816 10.7703 18.4986 12.6544C18.5142 14.122 19.0466 15.3432 20.0929 16.3129C20.5671 16.7629 21.0967 17.1107 21.6859 17.3578C21.5581 17.7283 21.4232 18.0832 21.2798 18.424ZM16.8418 0.960131C16.8418 2.11039 16.4216 3.18439 15.5839 4.17847C14.5731 5.36023 13.3505 6.04311 12.0246 5.93536C12.0077 5.79736 11.9979 5.65213 11.9979 5.49951C11.9979 4.39526 12.4786 3.21349 13.3323 2.24724C13.7585 1.75801 14.3005 1.35122 14.9579 1.02671C15.6138 0.707053 16.2342 0.530273 16.8177 0.5C16.8347 0.653772 16.8418 0.807554 16.8418 0.960116V0.960131Z"
        fill="#3B3B3B"
      />
    </Svg>
  );
}

function XBrandIcon() {
  return (
    <Svg height={24} viewBox="0 0 24 24" width={24}>
      <Path
        d="M13.9379 10.392L21.5324 1.5H19.7324L13.1399 9.2205L7.87188 1.5H1.79688L9.76188 13.176L1.79688 22.5H3.59688L10.5599 14.346L16.1234 22.5H22.1984L13.9379 10.392ZM11.4734 13.278L10.6664 12.1155L4.24488 2.865H7.00938L12.1904 10.3305L12.9974 11.493L19.7339 21.198H16.9694L11.4734 13.278Z"
        fill="#000000"
      />
    </Svg>
  );
}

function MicrosoftBrandIcon() {
  return (
    <Svg height={18} viewBox="0 0 18 18" width={18}>
      <Path d="M8.55464 8.55464H0V0H8.55464V8.55464Z" fill="#F1511B" />
      <Path d="M17.9999 8.55464H9.44531V0H17.9999V8.55464Z" fill="#80CC28" />
      <Path d="M8.55443 18H0V9.44531H8.55443V18Z" fill="#00ADEF" />
      <Path d="M17.9999 18H9.44531V9.44531H17.9999V18Z" fill="#FBBC09" />
    </Svg>
  );
}

function WalletConnectBrandIcon() {
  return (
    <Svg height={18} viewBox="0 0 18 18" width={18}>
      <Rect fill="#3B99FC" height={18} rx={6} width={18} />
      <Path
        d="M3.6842 6.10975C6.6192 3.29675 11.3792 3.29675 14.3142 6.10975L14.6672 6.44875C14.702 6.48148 14.7298 6.52099 14.7487 6.56484C14.7677 6.6087 14.7775 6.65597 14.7775 6.70375C14.7775 6.75153 14.7677 6.7988 14.7487 6.84266C14.7298 6.88651 14.702 6.92602 14.6672 6.95875L13.4592 8.11675C13.4232 8.15064 13.3756 8.16952 13.3262 8.16952C13.2768 8.16952 13.2292 8.15064 13.1932 8.11675L12.7072 7.65075C10.6592 5.68775 7.3392 5.68775 5.2912 7.65075L4.7712 8.14875C4.73521 8.18264 4.68764 8.20152 4.6382 8.20152C4.58876 8.20152 4.54119 8.18264 4.5052 8.14875L3.2962 6.99175C3.26139 6.95902 3.23365 6.91951 3.21469 6.87566C3.19572 6.8318 3.18594 6.78453 3.18594 6.73675C3.18594 6.68897 3.19572 6.6417 3.21469 6.59784C3.23365 6.55399 3.26139 6.51448 3.2962 6.48175L3.6842 6.10975ZM16.8142 8.50575L17.8892 9.53575C17.924 9.56848 17.9518 9.60799 17.9707 9.65184C17.9897 9.6957 17.9995 9.74297 17.9995 9.79075C17.9995 9.83853 17.9897 9.8858 17.9707 9.92966C17.9518 9.97351 17.924 10.013 17.8892 10.0457L13.0392 14.6938C12.9671 14.7608 12.8722 14.7981 12.7737 14.7981C12.6752 14.7981 12.5804 14.7608 12.5082 14.6938L9.0652 11.3947C9.04726 11.3781 9.02368 11.3688 8.9992 11.3688C8.97472 11.3688 8.95114 11.3781 8.9332 11.3947L5.4912 14.6947C5.419 14.7621 5.32394 14.7995 5.2252 14.7995C5.12647 14.7995 5.03141 14.7621 4.9592 14.6947L0.109201 10.0448C0.0747049 10.012 0.0472318 9.97266 0.0284572 9.92899C0.00968253 9.88532 0 9.83828 0 9.79075C0 9.74322 0.00968253 9.69618 0.0284572 9.65251C0.0472318 9.60884 0.0747049 9.56945 0.109201 9.53675L1.1852 8.50575C1.25702 8.43803 1.35199 8.40031 1.4507 8.40031C1.54941 8.40031 1.64439 8.43803 1.7162 8.50575L5.1582 11.8047C5.1762 11.8217 5.19998 11.8311 5.2247 11.8311C5.24942 11.8311 5.27321 11.8217 5.2912 11.8047L8.7332 8.50475C8.80507 8.43674 8.90026 8.39884 8.9992 8.39884C9.09815 8.39884 9.19333 8.43674 9.2652 8.50475L12.7072 11.8047C12.7252 11.8217 12.749 11.8311 12.7737 11.8311C12.7984 11.8311 12.8222 11.8217 12.8402 11.8047L16.2822 8.50475C16.3544 8.43769 16.4492 8.40042 16.5477 8.40042C16.6462 8.40042 16.741 8.43769 16.8132 8.50475"
        fill="#FFFFFF"
      />
    </Svg>
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
    maxWidth: mobileShellLayout.bottomNavMaxWidth,
  },
  page: {
    flexGrow: 1,
  },
  pageDesktop: {
    alignItems: "center",
    paddingBottom: 80,
    paddingHorizontal: 56,
  },
  pageMobile: {
    paddingBottom: mobileShellLayout.bottomNavClearance,
    paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
  },
  pageAuthMobile: {
    paddingHorizontal: 24,
  },
  authLayout: {
    alignItems: "center",
    alignSelf: "center",
    gap: 28,
    maxWidth: webAuthPage.desktop.maxWidth,
    width: "100%",
  },
  authLayoutDesktop: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: webAuthPage.desktop.contentGap,
    justifyContent: "center",
  },
  desktopFooter: {
    marginTop: 64,
    width: "100%",
  },
  heroFrame: {
    backgroundColor: colors.white,
    borderColor: "#E4E4E4",
    borderRadius: 24,
    borderWidth: 2,
    height: webAuthPage.desktop.cardHeight,
    maxWidth: webAuthPage.desktop.heroWidth,
    overflow: "hidden",
    width: webAuthPage.desktop.heroWidth,
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  card: {
    backgroundColor: colors.white,
    borderColor: "#E4E4E4",
    borderRadius: 24,
    borderWidth: 2,
    overflow: "hidden",
  },
  cardDesktop: {
    height: webAuthPage.desktop.cardHeight,
    maxWidth: webAuthPage.desktop.formCardWidth,
    width: webAuthPage.desktop.formCardWidth,
  },
  cardStacked: {
    maxWidth: webAuthPage.desktop.formCardWidth,
    width: "100%",
  },
  cardInner: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 40,
    paddingTop: 32,
  },
  cardInnerMobile: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  brandBlock: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 32,
    width: "100%",
  },
  brandBlockMobile: {
    gap: 8,
    paddingBottom: 32,
  },
  formLogo: {
    borderRadius: 14,
    height: 56,
    width: 56,
  },
  formLogoMobile: {
    marginBottom: 16,
  },
  formTitle: {
    color: "#00CC99",
    fontFamily: typography.family,
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 32.5,
  },
  formSubtitle: {
    color: "#7F7F7F",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 17.875,
  },
  formStack: {
    gap: 14,
    width: "100%",
    // Lift the whole phone-form container above its sibling sections (divider, social buttons)
    // so the country menu — trapped inside this stacking context — can overlay the items below it.
    zIndex: 20,
  },
  formStackMobile: {
    gap: 20,
  },
  countryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    width: "100%",
    // Lift the whole row (a flex item) above later fields so the floating country
    // menu wins hit-testing — not just paint order — over the phone field below it.
    zIndex: 30,
  },
  countryRowMobile: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 8,
    justifyContent: "flex-start",
    minHeight: 84,
  },
  fieldGroup: {
    gap: 8,
    width: "100%",
  },
  fieldLabel: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19.25,
  },
  countrySelect: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "#56D4AA",
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    width: 208,
  },
  countrySelectMobile: {
    width: "100%",
  },
  countrySelectWrap: {
    position: "relative",
    zIndex: 50,
  },
  // Tap-catcher behind the country menu (sits above the form fields at z:0, below the
  // country row at z:30 so menu items stay tappable). Closes the menu on outside tap —
  // the native counterpart to the web document listeners.
  countryMenuBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 25,
  },
  countrySelectWrapMobile: {
    width: "100%",
  },
  countrySelectOpen: {
    borderColor: "#00CC99",
  },
  countryMenu: {
    backgroundColor: colors.white,
    borderColor: "#E6E8EC",
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 12,
    left: 0,
    paddingVertical: 6,
    position: "absolute",
    right: 0,
    top: 64,
    zIndex: 50,
  },
  countryMenuItem: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  countryMenuItemSelected: {
    backgroundColor: "#ECFDF5",
  },
  countryMenuFlag: {
    fontSize: 20,
    lineHeight: 22,
  },
  countryMenuLabel: {
    color: "#1F2937",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  countryMenuDial: {
    color: "#6B7280",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  countryMenuCheckSpacer: {
    height: 16,
    width: 16,
  },
  countryFlag: {
    fontSize: 20,
    lineHeight: 22,
  },
  countryText: {
    color: "#3B3B3B",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 23,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  dialCodeBox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "#E4E4E4",
    borderRadius: 16,
    borderWidth: 1.5,
    height: 48,
    justifyContent: "center",
    width: 100,
  },
  dialCodeText: {
    color: "#B5B5B5",
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 23,
  },
  phoneInput: {
    backgroundColor: colors.white,
    borderColor: "#E4E4E4",
    borderRadius: 16,
    borderWidth: 1.5,
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "400",
    height: 48,
    lineHeight: 23,
    minWidth: 0,
    paddingHorizontal: 16,
  },
  privacyWrap: {
    alignItems: "center",
    borderColor: "#E4E4E4",
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    width: "100%",
  },
  privacyWrapMobile: {
    height: 72,
  },
  checkboxHitArea: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "#D0D5DD",
    borderRadius: 7,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  privacyText: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  privacyLink: {
    color: "#3E3E3E",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  primaryAction: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#55C99E",
    borderRadius: radii.chip,
    height: 48,
    justifyContent: "center",
    marginTop: 6,
    width: 218,
  },
  primaryActionMobile: {
    height: 52,
    width: "100%",
  },
  primaryActionDisabled: {
    backgroundColor: "#ECECEC",
  },
  primaryActionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  primaryActionTextDisabled: {
    color: "#9A9A9A",
  },
  otpStack: {
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  otpIntro: {
    color: "#555555",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
    textAlign: "center",
  },
  otpPhoneRow: {
    alignItems: "center",
    gap: 4,
  },
  otpSentTo: {
    color: "#777777",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
  },
  otpPhone: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "800",
  },
  changePhoneButton: {
    minHeight: 28,
    justifyContent: "center",
  },
  changePhoneText: {
    color: "#55C99E",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "800",
  },
  otpInputWrap: {
    height: 48,
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
  otpBoxRow: {
    flexDirection: "row",
    gap: 8,
    height: 48,
    pointerEvents: "none",
    width: "100%",
  },
  otpBox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "#E4E4E4",
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
  },
  otpBoxFilled: {
    borderColor: colors.primary,
  },
  otpBoxActive: {
    borderColor: "#56D4AA",
    borderWidth: 2,
  },
  otpBoxError: {
    borderColor: colors.danger,
  },
  otpBoxText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "800",
  },
  otpError: {
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
    gap: 8,
    justifyContent: "center",
  },
  resendText: {
    color: "#55C99E",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "800",
  },
  resendCountdown: {
    color: "#8D8D8D",
    fontFamily: typography.family,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  socialBlock: {
    gap: 14,
    marginTop: 20,
    width: "100%",
  },
  socialBlockMobile: {
    marginTop: 24,
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  dividerLine: {
    backgroundColor: "#E4E4E4",
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: "#7F7F7F",
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  dividerTextMobile: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.66,
  },
  socialRows: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  socialRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    width: "100%",
  },
  socialRowSecondary: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    width: "75%",
  },
  socialGridMobile: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    width: "100%",
  },
  socialButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "#E8E8E8",
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
    height: 60,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 10,
    width: 112,
  },
  socialButtonHovered: {
    borderColor: "#56D4AA",
  },
  socialButtonMobile: {
    height: 72,
    width: "48%",
  },
  socialLabel: {
    color: "#5C5C5C",
    fontFamily: typography.family,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12.5,
    textAlign: "center",
    width: "100%",
  },
  modeLink: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
    marginTop: 16,
  },
  modeLinkText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
});
