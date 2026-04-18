"use client";

/**
 * Account Setup (PromptPay-first onboarding).
 *
 * Entered from: Link-MyCashBack flow → Verify Success → "Continue".
 *
 * Three sub-flows, selected on the intro step:
 *   - registered_phone:   intro → rp_name → rp_qr → submit → success → home
 *   - other_phone:        intro → op_input → op_otp → op_name → submit → success → home
 *   - citizen_id:         intro → ci_input → ci_name → submit → success → home
 *
 * Bank Account / Crypto Wallet buttons on the intro step hop to the generic
 * `/method/create` editor that already supports those methods.
 *
 * Figma: 9756-214495 (overview) · 9022-914403 (primary frame).
 */

import { useRouter } from "@/i18n/navigation";
import { createMethodWithdraw } from "@/lib/services/withdraw";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  EMPTY_ACCOUNT_SETUP_FORM,
  type AccountSetupFormState,
  type AccountSetupStep,
  type PromptPayChoice,
} from "../accountSetupTypes";
import {
  canonicalThaiMobile,
  isCitizenIdValid,
  isNameValid,
  isOtpValid,
  isThaiMobileValid,
} from "../accountSetupValidators";
import { AccountSetupHeader } from "./AccountSetupHeader";
import { AccountSetupHeroPanel } from "./AccountSetupHeroPanel";
import { AccountSetupSuccessModal } from "./AccountSetupSuccessModal";
import {
  CitizenIdInputStep,
  IntroStep,
  NameConfirmationStep,
  OtherPhoneInputStep,
  OtherPhoneOtpStep,
  RegisteredPhoneQrStep,
} from "./AccountSetupSteps";

const HEADING_ID = "account-setup-heading";

/** Last-4 mask for showing a phone (e.g. `***1234`). */
function maskTail(phone: string | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "";
  return `***${digits.slice(-4)}`;
}

export default function AccountSetupScreen() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session } = useSession();

  const registeredPhone = session?.user?.mobile ?? "";
  const hasRegisteredPhone = Boolean(registeredPhone.trim());
  const maskedTail = useMemo(() => maskTail(registeredPhone), [registeredPhone]);

  const [step, setStep] = useState<AccountSetupStep>("intro");
  const [form, setForm] = useState<AccountSetupFormState>(() => ({
    ...EMPTY_ACCOUNT_SETUP_FORM,
    choice: hasRegisteredPhone ? "registered_phone" : "other_phone",
  }));
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [citizenIdError, setCitizenIdError] = useState<string | null>(null);

  const setChoice = (choice: PromptPayChoice) => setForm((s) => ({ ...s, choice }));

  /* ─── Submission (shared by all 3 paths) ──────────────────────────── */

  const save = useMutation({
    mutationFn: (payload: {
      account_no: string;
      bank_code: "PP_PHONE" | "PP_CITIZEN";
    }) =>
      createMethodWithdraw({
        account_no: payload.account_no,
        account_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        bank_name: "PromptPay",
        bank_code: payload.bank_code,
        is_default: true,
      }),
    onSuccess: () => setStep("success"),
    onError: () => toast.error(t("accountSetupSubmitError")),
  });

  /* ─── Navigation handlers per step ─────────────────────────────────── */

  // Intro → Next: branch by choice.
  const onIntroNext = () => {
    if (form.choice === "registered_phone") {
      if (!hasRegisteredPhone) {
        toast.error(t("accountSetupNoRegisteredPhoneError"));
        return;
      }
      setStep("rp_name");
    } else if (form.choice === "other_phone") {
      setPhoneError(null);
      setStep("op_input");
    } else {
      setCitizenIdError(null);
      setStep("ci_input");
    }
  };

  const onNotNow = () => router.push("/");
  const onChooseBank = () => router.push("/method/create");
  const onChooseCrypto = () => router.push("/method/create");

  // Registered-phone path: name → QR → submit.
  const onRpNameNext = () => {
    if (!isNameValid(form.firstName) || !isNameValid(form.lastName)) {
      // Field-level errors render below the inputs; no toast needed.
      return;
    }
    setStep("rp_qr");
  };
  const onRpQrNext = () => {
    save.mutate({ account_no: registeredPhone, bank_code: "PP_PHONE" });
  };

  // Other-phone path: input → OTP → name → submit.
  const onOpInputNext = () => {
    if (!isThaiMobileValid(form.otherPhoneDigits)) {
      setPhoneError(t("accountSetupOtherPhoneInvalidError"));
      return;
    }
    setPhoneError(null);
    setForm((s) => ({ ...s, otpInput: "" }));
    setOtpError(null);
    setStep("op_otp");
  };
  const onOpOtpNext = () => {
    if (!isOtpValid(form.otpInput)) {
      setOtpError(t("accountSetupOtpWrongError"));
      return;
    }
    setOtpError(null);
    setStep("op_name");
  };
  const onOpNameNext = () => {
    if (!isNameValid(form.firstName) || !isNameValid(form.lastName)) return;
    save.mutate({
      account_no: canonicalThaiMobile(form.otherPhoneDigits),
      bank_code: "PP_PHONE",
    });
  };

  // Citizen-ID path: input → name → submit.
  const onCiInputNext = () => {
    if (!isCitizenIdValid(form.citizenIdDigits)) {
      setCitizenIdError(t("accountSetupCitizenIdInvalidError"));
      return;
    }
    setCitizenIdError(null);
    setStep("ci_name");
  };
  const onCiNameNext = () => {
    if (!isNameValid(form.firstName) || !isNameValid(form.lastName)) return;
    save.mutate({ account_no: form.citizenIdDigits, bank_code: "PP_CITIZEN" });
  };

  const onSuccessDone = () => router.replace("/");

  /* ─── Render ───────────────────────────────────────────────────────── */

  return (
    <>
      <section
        className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8 md:py-12 lg:py-16"
        aria-labelledby={HEADING_ID}
      >
        <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12 lg:gap-20">
          <AccountSetupHeroPanel />

          <div className="mx-auto w-full max-w-[480px] md:mx-0">
            <AccountSetupHeader headingId={HEADING_ID} />

            {step === "intro" ? (
              <IntroStep
                maskedTail={maskedTail}
                hasRegisteredPhone={hasRegisteredPhone}
                choice={form.choice}
                setChoice={setChoice}
                submitting={save.isPending}
                onNext={onIntroNext}
                onNotNow={onNotNow}
                onChooseBank={onChooseBank}
                onChooseCrypto={onChooseCrypto}
              />
            ) : step === "rp_name" ? (
              <NameConfirmationStep
                firstName={form.firstName}
                lastName={form.lastName}
                setFirstName={(v) => setForm((s) => ({ ...s, firstName: v }))}
                setLastName={(v) => setForm((s) => ({ ...s, lastName: v }))}
                onBack={() => setStep("intro")}
                onNext={onRpNameNext}
                withQrStep
              />
            ) : step === "rp_qr" ? (
              <RegisteredPhoneQrStep
                onBack={() => setStep("rp_name")}
                onNext={onRpQrNext}
                submitting={save.isPending}
              />
            ) : step === "op_input" ? (
              <OtherPhoneInputStep
                value={form.otherPhoneDigits}
                setValue={(v) => setForm((s) => ({ ...s, otherPhoneDigits: v }))}
                error={phoneError}
                onBack={() => setStep("intro")}
                onNext={onOpInputNext}
              />
            ) : step === "op_otp" ? (
              <OtherPhoneOtpStep
                phoneTail={maskTail(form.otherPhoneDigits)}
                otp={form.otpInput}
                setOtp={(v) => setForm((s) => ({ ...s, otpInput: v }))}
                error={otpError}
                onBack={() => setStep("op_input")}
                onNext={onOpOtpNext}
              />
            ) : step === "op_name" ? (
              <NameConfirmationStep
                firstName={form.firstName}
                lastName={form.lastName}
                setFirstName={(v) => setForm((s) => ({ ...s, firstName: v }))}
                setLastName={(v) => setForm((s) => ({ ...s, lastName: v }))}
                onBack={() => setStep("op_otp")}
                onNext={onOpNameNext}
                submitting={save.isPending}
              />
            ) : step === "ci_input" ? (
              <CitizenIdInputStep
                value={form.citizenIdDigits}
                setValue={(v) => setForm((s) => ({ ...s, citizenIdDigits: v }))}
                error={citizenIdError}
                onBack={() => setStep("intro")}
                onNext={onCiInputNext}
              />
            ) : step === "ci_name" ? (
              <NameConfirmationStep
                firstName={form.firstName}
                lastName={form.lastName}
                setFirstName={(v) => setForm((s) => ({ ...s, firstName: v }))}
                setLastName={(v) => setForm((s) => ({ ...s, lastName: v }))}
                onBack={() => setStep("ci_input")}
                onNext={onCiNameNext}
                submitting={save.isPending}
              />
            ) : null /* step === "success" renders the modal below */}
          </div>
        </div>
      </section>

      <AccountSetupSuccessModal open={step === "success"} onDone={onSuccessDone} />
    </>
  );
}
