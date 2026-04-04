"use client";

import { PhoneOtpSixBoxes } from "@/features/auth/component/PhoneOtpSixBoxes";
import { formatOtpCountdown, maskEmailForDisplay } from "@/lib/link-mycashback/utils";
import type { LinkMyCashbackVerifyStepProps } from "./types";

export function LinkMyCashbackVerifyStep({
  copy,
  linkChannel,
  phoneDigits,
  emailValue,
  otpInput,
  setOtpInput,
  resendSeconds,
  onResend,
  onBack,
  onNext,
}: LinkMyCashbackVerifyStepProps) {
  const {
    verifyTitle,
    verifyDescriptionPhone,
    verifyDescriptionEmail,
    verifySentToPhoneLabel,
    verifySentToEmailLabel,
    verifyResendLabel,
    verifyOtpAriaLabel,
    verifyBack,
    verifyNext,
  } = copy;

  const otpDigits = otpInput.replace(/\D/g, "");
  const maskedDestination =
    linkChannel === "phone"
      ? phoneDigits.length >= 4
        ? `***${phoneDigits.slice(-4)}`
        : "****"
      : maskEmailForDisplay(emailValue);
  const sentLabel = linkChannel === "phone" ? verifySentToPhoneLabel : verifySentToEmailLabel;
  const description = linkChannel === "phone" ? verifyDescriptionPhone : verifyDescriptionEmail;

  return (
    <div className="mt-10 flex w-full flex-col items-center gap-6">
      <div className="flex w-full flex-col gap-1 text-left">
        <h2
          id="link-mycashback-verify-heading"
          className="text-base font-medium leading-normal text-[#3B3B3B]"
          aria-describedby="link-mycashback-verify-desc"
        >
          {verifyTitle}
        </h2>
        <p
          id="link-mycashback-verify-desc"
          className="text-sm font-normal leading-normal text-[#7F7F7F]"
        >
          {description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm leading-normal text-[#7F7F7F]">
          <span>{sentLabel}</span>
          <span className="whitespace-nowrap tabular-nums">{maskedDestination}</span>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-2">
        <PhoneOtpSixBoxes
          idPrefix="link-mycashback-otp"
          value={otpInput}
          onChange={setOtpInput}
          ariaLabel={verifyOtpAriaLabel}
        />
        <div className="flex flex-wrap items-center justify-center gap-1 py-px text-xs leading-normal">
          <button
            type="button"
            disabled={resendSeconds > 0}
            onClick={onResend}
            className="text-[#7f7f7f] underline decoration-solid underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
          >
            {verifyResendLabel}
          </button>
          <span className="text-[#0064d6]" aria-live="polite">
            {formatOtpCountdown(resendSeconds)}
          </span>
        </div>
      </div>

      <div className="flex w-full justify-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 w-[144px] shrink-0 items-center justify-center rounded-full border border-[#00CC99] bg-white px-3 text-xs font-medium text-[#00CC99] transition hover:bg-[#F0FAF7]"
        >
          {verifyBack}
        </button>
        <button
          type="button"
          disabled={otpDigits.length < 6}
          onClick={onNext}
          className="flex h-12 w-[144px] shrink-0 items-center justify-center rounded-full bg-[#F6F6F6] px-3 text-xs font-medium text-[#989898] disabled:cursor-not-allowed disabled:opacity-90 enabled:bg-[#00CC99] enabled:text-white enabled:hover:brightness-[0.98]"
        >
          {verifyNext}
        </button>
      </div>
    </div>
  );
}
