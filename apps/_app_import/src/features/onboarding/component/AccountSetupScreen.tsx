"use client";

/**
 * Account Setup (PromptPay-first onboarding).
 *
 * Entered from: Link-MyCashBack flow → Verify Success → "Continue".
 *
 * Three sub-flows, selected on the intro step:
 *   - registered_phone:   intro → submit → home (session's username is the
 *                         account holder name; no name/QR/modal prompts).
 *   - other_phone:        intro → op_input → op_otp → op_name → submit → home
 *   - citizen_id:         intro → ci_input → ci_name → submit → home
 *
 * Bank Account / Crypto Wallet buttons on the intro step hop to the generic
 * `/method/create` editor that already supports those methods.
 *
 * Figma: 9756-214495 (overview) · 9022-914403 (primary frame). The Figma
 * 3.1.3 multi-step (name → QR → success modal) is a richer future iteration;
 * current behaviour is the simplified MVP per product direction.
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
import {
  CitizenIdInputStep,
  IntroStep,
  NameConfirmationStep,
  OtherPhoneInputStep,
  OtherPhoneOtpStep,
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
      account_name: string;
      bank_code: "PP_PHONE" | "PP_CITIZEN";
    }) =>
      createMethodWithdraw({
        account_no: payload.account_no,
        account_name: payload.account_name,
        bank_name: "PromptPay",
        bank_code: payload.bank_code,
        is_default: true,
      }),
    onSuccess: () => {
      toast.success(t("accountSetupSubmitSuccess"));
      router.replace("/");
    },
    onError: () => toast.error(t("accountSetupSubmitError")),
  });

  /* ─── Navigation handlers per step ─────────────────────────────────── */

  // Intro → Next: branch by choice. Registered-phone submits immediately
  // using the session username as the PromptPay account holder name.
  const onIntroNext = () => {
    if (form.choice === "registered_phone") {
      if (!hasRegisteredPhone) {
        toast.error(t("accountSetupNoRegisteredPhoneError"));
        return;
      }
      save.mutate({
        account_no: registeredPhone,
        account_name: session?.user?.username ?? "",
        bank_code: "PP_PHONE",
      });
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
      account_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
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
    save.mutate({
      account_no: form.citizenIdDigits,
      account_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      bank_code: "PP_CITIZEN",
    });
  };

  /* ─── Render ───────────────────────────────────────────────────────── */

  return (
    <>
      {/*
        Outer layout mirrors the sign-in page (LoginComponent.tsx L532–546):
        1440px outer, 126px gap at lg, hero hidden until lg, form card in a
        rounded white card with a matching 690px desktop height.
      */}
      <section
        className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-10 md:px-10 md:pb-24 md:pt-20 lg:px-14 xl:max-2xl:px-20 2xl:px-28"
        aria-labelledby={HEADING_ID}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-[126px]">
          <AccountSetupHeroPanel />

          <div className="mx-auto flex w-full max-w-[480px] flex-col lg:mx-0 lg:h-[690px] lg:max-w-[600px] lg:shrink-0">
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-hidden rounded-[24px] border-2 border-[#e4e4e4] bg-white px-5 py-6 max-md:px-4 max-md:pb-7 md:px-6 lg:h-full lg:gap-6 lg:px-10 lg:py-8">
              <AccountSetupHeader headingId={HEADING_ID} />

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
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
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
