import { useRouter } from "expo-router";
import {
  Landmark as BankIcon,
  Phone as PhoneIcon,
  ShieldCheck as ShieldCheckIcon,
  Wallet as CryptoIcon,
} from "@mobile/theme/icons";
import { useState } from "react";
import {
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

import authHeroImage from "../../assets/auth-login-hero.png";
import logoMarkImage from "../../assets/nav/logo.png";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopHeader } from "@mobile/components/CustomerDesktopHeader";
import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { haptics } from "@mobile/lib/haptics";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout, webAccountSetupFlow } from "@mobile/design/webDesignParity";
import {
  canonicalThaiMobile,
  digitsOnly,
  emptyAccountSetupForm,
  isCitizenIdValid,
  isNameValid,
  isOtpValid,
  isThaiMobileValid,
  maskTail,
  type AccountSetupFormState,
  type AccountSetupStep,
  type PromptPayChoice,
} from "@mobile/features/accountSetup";
import { motion } from "@mobile/theme/motion";
import { colors, radii, spacing, typography } from "@mobile/theme/tokens";

type SavedPromptPayMethod = {
  accountName: string;
  accountNo: string;
  bankCode: "PP_PHONE" | "PP_CITIZEN";
};

export function CustomerAccountSetupScreen() {
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopShell = width >= mobileShellLayout.desktopBreakpoint;
  const isWideDesktop = width >= 1280;
  const registeredPhone = webAccountSetupFlow.registeredPhone;
  const hasRegisteredPhone = Boolean(registeredPhone.trim());
  const registeredPhoneTail = maskTail(registeredPhone);

  const [step, setStep] = useState<AccountSetupStep>("intro");
  const [form, setForm] = useState<AccountSetupFormState>({
    ...emptyAccountSetupForm,
    choice: hasRegisteredPhone ? "registered_phone" : "other_phone",
  });
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [citizenIdError, setCitizenIdError] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [, setSavedMethod] = useState<SavedPromptPayMethod | null>(null);

  const setChoice = (choice: PromptPayChoice) => {
    setStatusMessage("");
    setForm((current) => ({ ...current, choice }));
  };

  const submitPromptPay = (method: SavedPromptPayMethod) => {
    setSavedMethod(method);
    setStatusMessage(tc(webAccountSetupFlow.status.submitSuccess));
    // Fire-and-forget success cue on the save funnel (covers all three terminal paths).
    void haptics.success();
    router.replace("/");
  };

  const handleIntroNext = () => {
    setStatusMessage("");

    if (form.choice === "registered_phone") {
      if (!hasRegisteredPhone) {
        setStatusMessage(tc(webAccountSetupFlow.status.noRegisteredPhone));
        void haptics.error();
        return;
      }

      submitPromptPay({
        accountName: webAccountSetupFlow.registeredName,
        accountNo: registeredPhone,
        bankCode: "PP_PHONE",
      });
      return;
    }

    if (form.choice === "other_phone") {
      setPhoneError("");
      setStep("op_input");
      return;
    }

    setCitizenIdError("");
    setStep("ci_input");
  };

  const handleOtherPhoneNext = () => {
    if (!isThaiMobileValid(form.otherPhoneDigits)) {
      setPhoneError(tc(webAccountSetupFlow.steps.otherPhone.invalid));
      void haptics.error();
      return;
    }

    setPhoneError("");
    setOtpError("");
    setForm((current) => ({ ...current, otpInput: "" }));
    setStep("op_otp");
  };

  const handleOtpNext = () => {
    if (!isOtpValid(form.otpInput)) {
      setOtpError(tc(webAccountSetupFlow.steps.otp.invalid));
      void haptics.error();
      return;
    }

    setOtpError("");
    setNameSubmitted(false);
    setStep("op_name");
  };

  const handleOtherPhoneNameNext = () => {
    setNameSubmitted(true);

    if (!isNameValid(form.firstName) || !isNameValid(form.lastName)) {
      void haptics.error();
      return;
    }

    submitPromptPay({
      accountName: `${form.firstName.trim()} ${form.lastName.trim()}`,
      accountNo: canonicalThaiMobile(form.otherPhoneDigits),
      bankCode: "PP_PHONE",
    });
  };

  const handleCitizenIdNext = () => {
    if (!isCitizenIdValid(form.citizenIdDigits)) {
      setCitizenIdError(tc(webAccountSetupFlow.steps.citizenId.invalid));
      void haptics.error();
      return;
    }

    setCitizenIdError("");
    setNameSubmitted(false);
    setStep("ci_name");
  };

  const handleCitizenNameNext = () => {
    setNameSubmitted(true);

    if (!isNameValid(form.firstName) || !isNameValid(form.lastName)) {
      void haptics.error();
      return;
    }

    submitPromptPay({
      accountName: `${form.firstName.trim()} ${form.lastName.trim()}`,
      accountNo: digitsOnly(form.citizenIdDigits),
      bankCode: "PP_CITIZEN",
    });
  };

  const updateForm = <Key extends keyof AccountSetupFormState>(
    key: Key,
    value: AccountSetupFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <View style={styles.viewport}>
      <View style={[styles.shell, isDesktopShell ? styles.desktopShell : styles.phoneFrame]}>
        {isDesktopShell ? <CustomerDesktopHeader viewportWidth={width} /> : null}
        <KeyboardAwareScreen
          contentContainerStyle={[
            styles.page,
            isDesktopShell ? styles.pageDesktop : styles.pageMobile,
            {
              paddingTop: isDesktopShell ? 48 : Math.max(spacing.md, insets.top + spacing.md),
            },
          ]}
        >
          <View style={[styles.accountLayout, isWideDesktop ? styles.accountLayoutDesktop : null]}>
            {isWideDesktop ? (
              <View style={styles.heroFrame}>
                <Image
                  alt={tc(webAccountSetupFlow.heroAlt)}
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={tc(webAccountSetupFlow.heroAlt)}
                  resizeMode="cover"
                  source={authHeroImage}
                  style={styles.heroImage}
                />
              </View>
            ) : null}

            <View style={[styles.card, isWideDesktop ? styles.cardDesktop : styles.cardStacked]}>
              <CardBody scroll={isWideDesktop}>
                <AccountSetupHeader />

                <View style={styles.stepBody}>
                  {step === "intro" ? (
                    <IntroStep
                      choice={form.choice}
                      hasRegisteredPhone={hasRegisteredPhone}
                      maskedTail={registeredPhoneTail}
                      onChooseBank={() => router.push("/method/create")}
                      onChooseCrypto={() => router.push("/method/create")}
                      onNext={handleIntroNext}
                      onNotNow={() => router.replace("/")}
                      setChoice={setChoice}
                      statusMessage={statusMessage}
                    />
                  ) : step === "op_input" ? (
                    <PhoneInputStep
                      error={phoneError}
                      onBack={() => setStep("intro")}
                      onNext={handleOtherPhoneNext}
                      setValue={(value) =>
                        updateForm("otherPhoneDigits", digitsOnly(value).slice(0, 10))
                      }
                      value={form.otherPhoneDigits}
                    />
                  ) : step === "op_otp" ? (
                    <OtpStep
                      error={otpError}
                      onBack={() => setStep("op_input")}
                      onNext={handleOtpNext}
                      phoneTail={maskTail(form.otherPhoneDigits)}
                      setValue={(value) => updateForm("otpInput", digitsOnly(value).slice(0, 6))}
                      value={form.otpInput}
                    />
                  ) : step === "op_name" ? (
                    <NameStep
                      firstName={form.firstName}
                      lastName={form.lastName}
                      nameSubmitted={nameSubmitted}
                      onBack={() => setStep("op_otp")}
                      onNext={handleOtherPhoneNameNext}
                      setFirstName={(value) => updateForm("firstName", value)}
                      setLastName={(value) => updateForm("lastName", value)}
                    />
                  ) : step === "ci_input" ? (
                    <CitizenIdStep
                      error={citizenIdError}
                      onBack={() => setStep("intro")}
                      onNext={handleCitizenIdNext}
                      setValue={(value) =>
                        updateForm("citizenIdDigits", digitsOnly(value).slice(0, 13))
                      }
                      value={form.citizenIdDigits}
                    />
                  ) : step === "ci_name" ? (
                    <NameStep
                      firstName={form.firstName}
                      lastName={form.lastName}
                      nameSubmitted={nameSubmitted}
                      onBack={() => setStep("ci_input")}
                      onNext={handleCitizenNameNext}
                      setFirstName={(value) => updateForm("firstName", value)}
                      setLastName={(value) => updateForm("lastName", value)}
                    />
                  ) : null}
                </View>
              </CardBody>
            </View>
          </View>
            {isDesktopShell ? (
              <View style={styles.desktopFooter}>
                <CustomerDesktopFooter horizontalPadding={0} viewportWidth={width} />
              </View>
            ) : null}
          </KeyboardAwareScreen>
        </View>
      </View>
  );
}

function CardBody({ scroll, children }: { scroll: boolean; children: React.ReactNode }) {
  // On wide desktop the card has a fixed height (to sit flush beside the hero), so its
  // content must scroll internally; on stacked/mobile the card grows and the page scrolls.
  if (scroll) {
    return (
      <ScrollView
        contentContainerStyle={styles.cardScrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.cardScroll}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={styles.cardInner}>{children}</View>;
}

function AccountSetupHeader() {
  const tc = useCopy();
  return (
    <View style={styles.brandBlock}>
      <Image
        alt="GoGoCash logo"
        accessibilityIgnoresInvertColors
        accessibilityLabel="GoGoCash logo"
        source={logoMarkImage}
        style={styles.formLogo}
      />
      <Text style={styles.formTitle}>{tc(webAccountSetupFlow.title)}</Text>
      <Text style={styles.formSubtitle}>{tc(webAccountSetupFlow.subtitle)}</Text>
      <PromptPayBadge />
    </View>
  );
}

function PromptPayBadge() {
  return (
    <View accessibilityLabel="PromptPay" style={styles.promptPayBadge}>
      <Text style={styles.promptPayPrimary}>{webAccountSetupFlow.promptPay.primary}</Text>
      <Text style={styles.promptPaySecondary}>{webAccountSetupFlow.promptPay.secondary}</Text>
      <Text style={styles.promptPayThai}>{webAccountSetupFlow.promptPay.thai}</Text>
    </View>
  );
}

function IntroStep({
  choice,
  hasRegisteredPhone,
  maskedTail,
  onChooseBank,
  onChooseCrypto,
  onNext,
  onNotNow,
  setChoice,
  statusMessage,
}: {
  choice: PromptPayChoice;
  hasRegisteredPhone: boolean;
  maskedTail: string;
  onChooseBank: () => void;
  onChooseCrypto: () => void;
  onNext: () => void;
  onNotNow: () => void;
  setChoice: (choice: PromptPayChoice) => void;
  statusMessage: string;
}) {
  const tc = useCopy();
  const registeredLabel = hasRegisteredPhone
    ? webAccountSetupFlow.options.registeredPhone.replace("{tail}", maskedTail)
    : tc(webAccountSetupFlow.options.registeredPhoneUnavailable);

  return (
    <View style={styles.stack}>
      <SectionHeading
        description={tc(webAccountSetupFlow.sectionDescription)}
        title={tc(webAccountSetupFlow.sectionTitle)}
      />

      <View accessibilityLabel={tc(webAccountSetupFlow.sectionTitle)} style={styles.radioGroup}>
        <RadioCard
          checked={choice === "registered_phone"}
          disabled={!hasRegisteredPhone}
          icon={<PhoneIcon color="#00AA80" size={22} strokeWidth={2} />}
          label={registeredLabel}
          onPress={() => setChoice("registered_phone")}
        />
        <RadioCard
          checked={choice === "other_phone"}
          icon={<PhoneIcon color="#00AA80" size={22} strokeWidth={2} />}
          label={tc(webAccountSetupFlow.options.otherPhone)}
          onPress={() => setChoice("other_phone")}
        />
        <RadioCard
          checked={choice === "citizen_id"}
          icon={<ShieldCheckIcon color="#00AA80" size={22} strokeWidth={2} />}
          label={tc(webAccountSetupFlow.options.citizenId)}
          onPress={() => setChoice("citizen_id")}
        />
      </View>

      {statusMessage ? (
        <Text accessibilityRole="alert" style={styles.statusText}>
          {statusMessage}
        </Text>
      ) : null}

      <View style={styles.actionRow}>
        <SecondaryButton label={tc(webAccountSetupFlow.actions.notNow)} onPress={onNotNow} />
        <PrimaryButton label={tc(webAccountSetupFlow.actions.next)} onPress={onNext} />
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{tc(webAccountSetupFlow.actions.divider)}</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.altGrid}>
        <AltMethodButton
          icon={<BankIcon color="#00AA80" size={30} strokeWidth={2} />}
          label={tc(webAccountSetupFlow.actions.bank)}
          onPress={onChooseBank}
        />
        <AltMethodButton
          icon={<CryptoIcon color="#00AA80" size={30} strokeWidth={2} />}
          label={tc(webAccountSetupFlow.actions.crypto)}
          onPress={onChooseCrypto}
        />
      </View>
    </View>
  );
}

function PhoneInputStep({
  error,
  onBack,
  onNext,
  setValue,
  value,
}: {
  error: string;
  onBack: () => void;
  onNext: () => void;
  setValue: (value: string) => void;
  value: string;
}) {
  const tc = useCopy();
  return (
    <View style={styles.stack}>
      <SectionHeading
        description={tc(webAccountSetupFlow.steps.otherPhone.description)}
        title={tc(webAccountSetupFlow.steps.otherPhone.title)}
      />
      <FieldInput
        accessibilityLabel={tc(webAccountSetupFlow.steps.otherPhone.ariaLabel)}
        error={error}
        keyboardType="phone-pad"
        maxLength={10}
        onChangeText={setValue}
        placeholder={tc(webAccountSetupFlow.steps.otherPhone.placeholder)}
        value={value}
      />
      <StepFooter onBack={onBack} onNext={onNext} nextLabel={tc(webAccountSetupFlow.actions.next)} />
    </View>
  );
}

function OtpStep({
  error,
  onBack,
  onNext,
  phoneTail,
  setValue,
  value,
}: {
  error: string;
  onBack: () => void;
  onNext: () => void;
  phoneTail: string;
  setValue: (value: string) => void;
  value: string;
}) {
  const tc = useCopy();
  // Interpolated template ("...{tail}...") — left untranslated; no clean static sub-part to wrap.
  const description = webAccountSetupFlow.steps.otp.description.replace("{tail}", phoneTail);

  return (
    <View style={styles.stack}>
      <SectionHeading description={description} title={tc(webAccountSetupFlow.steps.otp.title)} />
      <View style={styles.otpBoxRow}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={[styles.otpBox, error ? styles.fieldError : null]}>
            <Text style={styles.otpBoxText}>{value[index] ?? ""}</Text>
          </View>
        ))}
      </View>
      <FieldInput
        accessibilityLabel={tc(webAccountSetupFlow.steps.otp.ariaLabel)}
        error={error}
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={setValue}
        placeholder={tc(webAccountSetupFlow.steps.otp.placeholder)}
        value={value}
      />
      <StepFooter onBack={onBack} onNext={onNext} nextLabel={tc(webAccountSetupFlow.actions.next)} />
    </View>
  );
}

function CitizenIdStep({
  error,
  onBack,
  onNext,
  setValue,
  value,
}: {
  error: string;
  onBack: () => void;
  onNext: () => void;
  setValue: (value: string) => void;
  value: string;
}) {
  const tc = useCopy();
  return (
    <View style={styles.stack}>
      <SectionHeading
        description={tc(webAccountSetupFlow.steps.citizenId.description)}
        title={tc(webAccountSetupFlow.steps.citizenId.title)}
      />
      <FieldInput
        accessibilityLabel={tc(webAccountSetupFlow.steps.citizenId.ariaLabel)}
        error={error}
        keyboardType="number-pad"
        maxLength={13}
        onChangeText={setValue}
        placeholder={tc(webAccountSetupFlow.steps.citizenId.placeholder)}
        value={value}
      />
      <StepFooter onBack={onBack} onNext={onNext} nextLabel={tc(webAccountSetupFlow.actions.next)} />
    </View>
  );
}

function NameStep({
  firstName,
  lastName,
  nameSubmitted,
  onBack,
  onNext,
  setFirstName,
  setLastName,
}: {
  firstName: string;
  lastName: string;
  nameSubmitted: boolean;
  onBack: () => void;
  onNext: () => void;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
}) {
  const tc = useCopy();
  const firstNameError =
    nameSubmitted && !isNameValid(firstName) ? tc(webAccountSetupFlow.steps.name.required) : "";
  const lastNameError =
    nameSubmitted && !isNameValid(lastName) ? tc(webAccountSetupFlow.steps.name.required) : "";

  return (
    <View style={styles.stack}>
      <SectionHeading
        description={tc(webAccountSetupFlow.steps.name.description)}
        title={tc(webAccountSetupFlow.steps.name.title)}
      />
      <FieldInput
        accessibilityLabel={tc(webAccountSetupFlow.steps.name.firstNameAriaLabel)}
        error={firstNameError}
        onChangeText={setFirstName}
        placeholder={tc(webAccountSetupFlow.steps.name.firstNamePlaceholder)}
        value={firstName}
      />
      <FieldInput
        accessibilityLabel={tc(webAccountSetupFlow.steps.name.lastNameAriaLabel)}
        error={lastNameError}
        onChangeText={setLastName}
        placeholder={tc(webAccountSetupFlow.steps.name.lastNamePlaceholder)}
        value={lastName}
      />
      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel={tc(webAccountSetupFlow.actions.confirm)}
      />
    </View>
  );
}

function SectionHeading({ description, title }: { description: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
  );
}

function RadioCard({
  checked,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  checked: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hoverLift={false}
      onPress={onPress}
      pressScale={motion.scale.subtlePress}
      style={[
        styles.radioCard,
        checked ? styles.radioCardSelected : null,
        disabled ? styles.radioCardDisabled : null,
      ]}
    >
      <View style={[styles.radioDot, checked ? styles.radioDotSelected : null]}>
        {checked ? <View style={styles.radioDotInner} /> : null}
      </View>
      <View style={styles.radioIcon}>{icon}</View>
      <Text style={styles.radioLabel}>{label}</Text>
    </MotionPressable>
  );
}

function FieldInput({
  accessibilityLabel,
  error,
  keyboardType = "default",
  maxLength,
  onChangeText,
  placeholder,
  value,
}: {
  accessibilityLabel: string;
  error: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  maxLength?: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        aria-invalid={Boolean(error)}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA8A0"
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function StepFooter({
  nextLabel,
  onBack,
  onNext,
}: {
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const tc = useCopy();
  return (
    <View style={styles.actionRow}>
      <SecondaryButton label={tc(webAccountSetupFlow.actions.back)} onPress={onBack} />
      <PrimaryButton label={nextLabel} onPress={onNext} />
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <MotionPressable
      accessibilityRole="button"
      hoverLift={false}
      onPress={onPress}
      pressScale={motion.scale.subtlePress}
      style={styles.primaryAction}
    >
      <Text style={styles.primaryActionText}>{label}</Text>
    </MotionPressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <MotionPressable
      accessibilityRole="button"
      hoverLift={false}
      onPress={onPress}
      pressScale={motion.scale.subtlePress}
      style={styles.secondaryAction}
    >
      <Text style={styles.secondaryActionText}>{label}</Text>
    </MotionPressable>
  );
}

function AltMethodButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.altMethodCard}>
      {icon}
      <Text style={styles.altMethodLabel}>{label}</Text>
    </Pressable>
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
  accountLayout: {
    alignItems: "center",
    alignSelf: "center",
    gap: 28,
    maxWidth: webAccountSetupFlow.desktop.maxWidth,
    width: "100%",
  },
  accountLayoutDesktop: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: webAccountSetupFlow.desktop.contentGap,
    justifyContent: "center",
  },
  desktopFooter: {
    marginTop: 64,
    width: "100%",
  },
  heroFrame: {
    backgroundColor: colors.white,
    borderColor: "#E4E4E4",
    borderRadius: radii.xl,
    borderWidth: 2,
    height: webAccountSetupFlow.desktop.cardHeight,
    maxWidth: webAccountSetupFlow.desktop.heroWidth,
    overflow: "hidden",
    width: webAccountSetupFlow.desktop.heroWidth,
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  card: {
    backgroundColor: colors.white,
    borderColor: "#E4E4E4",
    borderRadius: radii.xl,
    borderWidth: 2,
    overflow: "hidden",
  },
  cardDesktop: {
    height: webAccountSetupFlow.desktop.cardHeight,
    maxWidth: webAccountSetupFlow.desktop.formCardWidth,
    width: webAccountSetupFlow.desktop.formCardWidth,
  },
  cardStacked: {
    maxWidth: webAccountSetupFlow.desktop.formCardWidth,
    width: "100%",
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  cardScroll: {
    flex: 1,
  },
  cardScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  brandBlock: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 24,
    width: "100%",
  },
  formLogo: {
    borderRadius: 14,
    height: 56,
    width: 56,
  },
  formTitle: {
    color: colors.primary,
    fontFamily: typography.family,
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 32.5,
  },
  formSubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    textAlign: "center",
  },
  promptPayBadge: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "rgba(0, 47, 108, 0.2)",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  promptPayPrimary: {
    color: "#002F6C",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "800",
  },
  promptPaySecondary: {
    color: "#00A1D6",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "800",
  },
  promptPayThai: {
    color: "#002F6C",
    fontFamily: typography.thaiFamily,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },
  stepBody: {
    width: "100%",
  },
  stack: {
    gap: 18,
    paddingBottom: 28,
    width: "100%",
  },
  sectionHeading: {
    gap: 8,
  },
  sectionTitle: {
    color: "#103522",
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  sectionDescription: {
    color: "#5B6B61",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 21,
  },
  radioGroup: {
    gap: 12,
  },
  radioCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "#E4EAE6",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  radioCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  radioCardDisabled: {
    opacity: 0.55,
  },
  radioDot: {
    alignItems: "center",
    borderColor: "#BFC8C2",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  radioDotSelected: {
    borderColor: colors.primary,
  },
  radioDotInner: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  radioIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 26,
  },
  radioLabel: {
    color: "#103522",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  statusText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  primaryActionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderRadius: radii.chip,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  secondaryActionText: {
    color: colors.primary,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  dividerLine: {
    backgroundColor: "#E4EAE6",
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: "#8D9B93",
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
    textTransform: "uppercase",
  },
  altGrid: {
    flexDirection: "row",
    gap: 12,
  },
  altMethodCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "#E4EAE6",
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 88,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  altMethodLabel: {
    color: "#103522",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
  fieldWrap: {
    gap: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: "#E4EAE6",
    borderRadius: radii.md,
    borderWidth: 1,
    color: "#103522",
    fontFamily: typography.family,
    fontSize: 15,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  otpBoxRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  otpBox: {
    alignItems: "center",
    borderColor: "#E4EAE6",
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 42,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  otpBoxText: {
    color: "#103522",
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
  },
});
