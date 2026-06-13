"use client";

/**
 * Account Setup — step bodies.
 *
 * All steps share the outer frame (hero panel + header). Only the form body
 * and footer change between steps. Each step is a small, focused component
 * that takes form state + navigation handlers as props; the orchestrator
 * (`AccountSetupScreen`) owns state and decides which step is rendered.
 *
 * Figma: 9756-214495 (full flow overview).
 */

import { PhoneOtpSixBoxes } from "@/features/auth/component/PhoneOtpSixBoxes";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import { useTranslations } from "next-intl";
import { useId } from "react";
import type { PromptPayChoice } from "../accountSetupTypes";

/* ───── Shared UI pieces ───────────────────────────────────────────────── */

const MINT_DARK = "#00AA80";

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[16px] font-semibold leading-snug text-[#103522]">{title}</h2>
      {description ? (
        <p className="text-[14px] leading-relaxed text-[#5B6B61]">{description}</p>
      ) : null}
    </div>
  );
}

/** Bottom navigation row present on every non-intro step. */
function StepFooter({
  onBack,
  onNext,
  backLabel,
  nextLabel,
  nextDisabled = false,
  submitting = false,
}: {
  onBack: () => void;
  onNext: () => void;
  backLabel: string;
  nextLabel: string;
  nextDisabled?: boolean;
  submitting?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#00CC99] bg-white px-6 py-3 text-[15px] font-semibold text-[#00CC99] transition hover:bg-[#F0FAF7] active:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || submitting}
        className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#00CC99] px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-[0.98] active:brightness-[0.95] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {nextLabel}
      </button>
    </div>
  );
}

/** Text input with error state styling — used by phone + citizen ID steps. */
function FieldInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  inputMode = "text",
  maxLength,
  hasError = false,
  errorMessageId,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  inputMode?: "text" | "numeric" | "tel";
  maxLength?: number;
  hasError?: boolean;
  errorMessageId?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? errorMessageId : undefined}
      inputMode={inputMode}
      maxLength={maxLength}
      autoFocus={autoFocus}
      className={[
        "h-[56px] w-full rounded-2xl border bg-white px-4 text-[15px] text-[#103522] outline-none transition",
        hasError
          ? "border-[#CD0D0D] focus:border-[#CD0D0D] focus:ring-2 focus:ring-[#CD0D0D]/20"
          : "border-[#E4EAE6] focus:border-[#00CC99] focus:ring-2 focus:ring-[#00CC99]/20",
      ].join(" ")}
    />
  );
}

function FieldErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-[13px] leading-snug text-[#CD0D0D]">
      {children}
    </p>
  );
}

/* ───── Intro: radio selection ─────────────────────────────────────────── */

export function IntroStep({
  maskedTail,
  hasRegisteredPhone,
  choice,
  setChoice,
  submitting,
  onNext,
  onNotNow,
  onChooseBank,
  onChooseCrypto,
}: {
  maskedTail: string;
  hasRegisteredPhone: boolean;
  choice: PromptPayChoice;
  setChoice: (c: PromptPayChoice) => void;
  submitting: boolean;
  onNext: () => void;
  onNotNow: () => void;
  onChooseBank: () => void;
  onChooseCrypto: () => void;
}) {
  const t = useTranslations();

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        <SectionHeading
          title={t("accountSetupSectionTitle")}
          description={t("accountSetupSectionDescription")}
        />
      </div>

      <fieldset className="mt-6 flex flex-col gap-3" aria-label={t("accountSetupSectionTitle")}>
        <RadioCard
          label={
            hasRegisteredPhone
              ? t("accountSetupOptionRegisteredPhone", { tail: maskedTail })
              : t("accountSetupOptionRegisteredPhoneUnavailable")
          }
          checked={choice === "registered_phone"}
          disabled={!hasRegisteredPhone}
          onSelect={() => setChoice("registered_phone")}
        />
        <RadioCard
          label={t("accountSetupOptionOtherPhone")}
          checked={choice === "other_phone"}
          onSelect={() => setChoice("other_phone")}
        />
        <RadioCard
          label={t("accountSetupOptionCitizenId")}
          checked={choice === "citizen_id"}
          onSelect={() => setChoice("citizen_id")}
        />
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={onNotNow}
          disabled={submitting}
          className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#00CC99] bg-white px-6 py-3 text-[15px] font-semibold text-[#00CC99] transition hover:bg-[#F0FAF7] active:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("accountSetupNotNow")}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={submitting}
          className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#00CC99] px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-[0.98] active:brightness-[0.95] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? t("accountSetupNextSaving") : t("accountSetupNext")}
        </button>
      </div>

      <div className="my-8 flex items-center gap-4 text-[12px] uppercase tracking-wide text-[#9AA8A0]">
        <span className="h-px flex-1 bg-[#E4EAE6]" aria-hidden />
        <span>{t("accountSetupOrDivider")}</span>
        <span className="h-px flex-1 bg-[#E4EAE6]" aria-hidden />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AltMethodButton
          icon={<AccountBalanceOutlinedIcon sx={{ fontSize: 28, color: MINT_DARK }} />}
          label={t("accountSetupAltBankAccount")}
          onClick={onChooseBank}
        />
        <AltMethodButton
          icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 28, color: MINT_DARK }} />}
          label={t("accountSetupAltCryptoWallet")}
          onClick={onChooseCrypto}
        />
      </div>
    </>
  );
}

function RadioCard({
  label,
  checked,
  disabled = false,
  onSelect,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={[
        "flex min-h-[56px] w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left text-[14px] font-medium transition",
        checked ? "border-[#00CC99] shadow-[0_0_0_1px_#00CC99_inset]" : "border-[#E4EAE6]",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-[#00CC99]/60 active:brightness-[0.98]",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-[#00CC99]" : "border-[#BFC8C2]",
        ].join(" ")}
      >
        {checked ? <span className="size-2.5 rounded-full bg-[#00CC99]" /> : null}
      </span>
      <span className="min-w-0 flex-1 text-[#103522]">{label}</span>
    </button>
  );
}

function AltMethodButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#E4EAE6] bg-white px-4 py-3 text-[14px] font-medium text-[#103522] transition hover:border-[#00CC99]/60 active:brightness-[0.98]"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ───── 3.1.1 Other Phone: input step ──────────────────────────────────── */

export function OtherPhoneInputStep({
  value,
  setValue,
  error,
  onBack,
  onNext,
}: {
  value: string;
  setValue: (v: string) => void;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations();
  const errorId = useId();

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        <SectionHeading
          title={t("accountSetupOtherPhoneTitle")}
          description={t("accountSetupOtherPhoneDescription")}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <FieldInput
          value={value}
          onChange={(raw) => setValue(raw.replace(/\D/g, "").slice(0, 10))}
          placeholder={t("accountSetupOtherPhonePlaceholder")}
          ariaLabel={t("accountSetupOtherPhoneAriaLabel")}
          inputMode="tel"
          maxLength={10}
          hasError={Boolean(error)}
          errorMessageId={errorId}
          autoFocus
        />
        {error ? <FieldErrorText id={errorId}>{error}</FieldErrorText> : null}
      </div>

      <div className="mt-6">
        <StepFooter
          onBack={onBack}
          onNext={onNext}
          backLabel={t("accountSetupBack")}
          nextLabel={t("accountSetupNext")}
        />
      </div>
    </>
  );
}

/* ───── 3.1.1 Other Phone: OTP step ────────────────────────────────────── */

export function OtherPhoneOtpStep({
  phoneTail,
  otp,
  setOtp,
  error,
  onBack,
  onNext,
  submitting = false,
}: {
  phoneTail: string;
  otp: string;
  setOtp: (v: string) => void;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
  submitting?: boolean;
}) {
  const t = useTranslations();
  const errorId = useId();

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        <SectionHeading
          title={t("accountSetupOtpTitle")}
          description={t("accountSetupOtpDescription", { tail: phoneTail })}
        />
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <PhoneOtpSixBoxes
          value={otp}
          onChange={setOtp}
          hasError={Boolean(error)}
          ariaLabel={t("accountSetupOtpAriaLabel")}
          errorDescriptionId={error ? errorId : undefined}
        />
        {error ? (
          <div role="alert" id={errorId} className="text-[13px] font-medium text-[#CD0D0D]">
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        <StepFooter
          onBack={onBack}
          onNext={onNext}
          backLabel={t("accountSetupBack")}
          nextLabel={submitting ? t("accountSetupNextSaving") : t("accountSetupNext")}
          submitting={submitting}
        />
      </div>
    </>
  );
}

/* ───── 3.1.2 Citizen ID: input step ───────────────────────────────────── */

export function CitizenIdInputStep({
  value,
  setValue,
  error,
  onBack,
  onNext,
}: {
  value: string;
  setValue: (v: string) => void;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations();
  const errorId = useId();

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        <SectionHeading
          title={t("accountSetupCitizenIdTitle")}
          description={t("accountSetupCitizenIdDescription")}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <FieldInput
          value={value}
          onChange={(raw) => setValue(raw.replace(/\D/g, "").slice(0, 13))}
          placeholder={t("accountSetupCitizenIdPlaceholder")}
          ariaLabel={t("accountSetupCitizenIdAriaLabel")}
          inputMode="numeric"
          maxLength={13}
          hasError={Boolean(error)}
          errorMessageId={errorId}
          autoFocus
        />
        {error ? <FieldErrorText id={errorId}>{error}</FieldErrorText> : null}
      </div>

      <div className="mt-6">
        <StepFooter
          onBack={onBack}
          onNext={onNext}
          backLabel={t("accountSetupBack")}
          nextLabel={t("accountSetupNext")}
        />
      </div>
    </>
  );
}

/* ───── Name confirmation (shared by other-phone + citizen-id flows) ───── */

export function NameConfirmationStep({
  firstName,
  lastName,
  setFirstName,
  setLastName,
  onBack,
  onNext,
  submitting = false,
}: {
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  submitting?: boolean;
}) {
  const t = useTranslations();
  const firstErrorId = useId();
  const lastErrorId = useId();

  const firstError = firstName.length > 0 && firstName.trim().length === 0;
  const lastError = lastName.length > 0 && lastName.trim().length === 0;

  const nextLabel = submitting ? t("accountSetupNextSaving") : t("accountSetupConfirmSave");

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        <SectionHeading
          title={t("accountSetupNameTitle")}
          description={t("accountSetupNameDescription")}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <FieldInput
          value={firstName}
          onChange={setFirstName}
          placeholder={t("accountSetupFirstNamePlaceholder")}
          ariaLabel={t("accountSetupFirstNameAriaLabel")}
          hasError={firstError}
          errorMessageId={firstErrorId}
          autoFocus
        />
        {firstError ? (
          <FieldErrorText id={firstErrorId}>{t("accountSetupNameRequiredError")}</FieldErrorText>
        ) : null}

        <FieldInput
          value={lastName}
          onChange={setLastName}
          placeholder={t("accountSetupLastNamePlaceholder")}
          ariaLabel={t("accountSetupLastNameAriaLabel")}
          hasError={lastError}
          errorMessageId={lastErrorId}
        />
        {lastError ? (
          <FieldErrorText id={lastErrorId}>{t("accountSetupNameRequiredError")}</FieldErrorText>
        ) : null}
      </div>

      <div className="mt-6">
        <StepFooter
          onBack={onBack}
          onNext={onNext}
          backLabel={t("accountSetupBack")}
          nextLabel={nextLabel}
          submitting={submitting}
        />
      </div>
    </>
  );
}
