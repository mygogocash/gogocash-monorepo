"use client";

/**
 * Link + MyCashback onboarding. Do not use `useTranslations`/`t()` in this folder:
 * stale Turbopack client bundles can throw MISSING_MESSAGE.
 * Copy resolves via static locale JSON → en fallback → literals (`copy.ts`).
 *
 * Figma: intro 9569-167488 · method 9573-224702 · verify 9573-225076 · account setup 9022-914403
 * Valid OTP → success step; Continue → `/account-setup` (PromptPay-first onboarding).
 * Skip (intro) → `/method/create` (generic editor; unchanged).
 */

import { Link, useRouter } from "@/i18n/navigation";
import { LogoMark } from "@/components/brand/LogoMark";
import { BRAND_MINT_HEX } from "@/constants/brand";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { isLinkMyCashbackOtpValid } from "@/lib/link-mycashback/isLinkMyCashbackOtpValid";
import { useLinkMyCashbackScreenCopy } from "./copy";
import { LinkConnectorDots } from "./LinkConnectorDots";
import { LinkMyCashbackMethodStep } from "./MethodStep";
import type { LinkMyCashbackChannel, LinkStep } from "./types";
import { LinkMyCashbackVerifySuccessStep } from "./VerifySuccessStep";
import { LinkMyCashbackVerifyStep } from "./VerifyStep";

export default function LinkMyCashbackScreen() {
  const router = useRouter();
  const copy = useLinkMyCashbackScreenCopy();
  const [linkStep, setLinkStep] = useState<LinkStep>("intro");
  const [linkChannel, setLinkChannel] = useState<LinkMyCashbackChannel>("phone");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  useEffect(() => {
    if (linkStep !== "verify" || resendSeconds <= 0) {
      return;
    }
    const t = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [linkStep, resendSeconds]);

  const phoneDigitsForMask = phoneLocal.replace(/\D/g, "");

  const goToVerifyStep = () => {
    setOtpInput("");
    setResendSeconds(60);
    setLinkStep("verify");
  };

  const onVerifyResend = () => {
    if (resendSeconds > 0) {
      return;
    }
    setResendSeconds(60);
  };

  const goToAccountSetupAfterVerify = () => {
    router.replace("/account-setup");
  };

  const onVerifyOtpSubmit = useCallback(() => {
    const digits = otpInput.replace(/\D/g, "");
    if (digits.length < 6) {
      return;
    }
    setVerifySubmitting(true);
    try {
      if (!isLinkMyCashbackOtpValid(digits)) {
        toast.error(copy.verify.verifyInvalidOtp);
        return;
      }
      setLinkStep("verify_success");
    } finally {
      setVerifySubmitting(false);
    }
  }, [copy.verify.verifyInvalidOtp, otpInput]);

  const sectionHeadingId =
    linkStep === "intro"
      ? "link-mycashback-heading"
      : linkStep === "method"
        ? "link-mycashback-method-heading"
        : linkStep === "verify_success"
          ? "link-mycashback-verify-success-heading"
          : "link-mycashback-verify-heading";

  return (
    <div className="mx-auto w-full max-w-[480px] px-6 pb-16 pt-10 md:px-8 md:pt-16">
      <div className="mb-6 flex justify-center">
        <Link
          href="/"
          aria-label={copy.goGoCashAria}
          className="flex min-h-11 shrink-0 items-center justify-center rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007b5c]"
        >
          <LogoMark />
        </Link>
      </div>
      <h1
        className="text-center text-[32px] font-semibold leading-tight tracking-tight"
        style={{ color: BRAND_MINT_HEX }}
      >
        {copy.pageTitle}
      </h1>
      <p className="mx-auto mt-3 max-w-[400px] text-center text-[15px] leading-relaxed text-[#5B6B61]">
        {copy.pageSubtitle}
      </p>

      <section className="mt-10" aria-labelledby={sectionHeadingId}>
        <div className="mx-auto flex w-full max-w-[272px] items-center justify-center gap-4">
          <div className="size-16 shrink-0 overflow-hidden rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <Image
              src="/images/link-mycashback-gogocash.png"
              alt={copy.goGoCashImageLabel}
              width={64}
              height={64}
              className="size-full object-contain"
              priority
            />
          </div>

          <LinkConnectorDots />

          <div className="size-16 shrink-0 overflow-hidden rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <Image
              src="/images/link-mycashback-shop.png"
              alt={copy.myCashbackImageAlt}
              width={64}
              height={64}
              className="size-full object-contain"
              priority
            />
          </div>
        </div>

        {linkStep === "intro" ? (
          <>
            <h2
              id="link-mycashback-heading"
              className="mt-10 text-center text-lg font-semibold leading-snug text-[#103522] sm:text-[18px]"
              aria-describedby="link-mycashback-card-desc"
            >
              {copy.cardTitle}
            </h2>
            <p
              id="link-mycashback-card-desc"
              className="mx-auto mt-3 max-w-[400px] text-center text-[14px] leading-relaxed text-[#5B6B61] sm:text-[15px]"
            >
              {copy.cardDescription}
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
              <button
                type="button"
                onClick={() => router.push("/method/create")}
                className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#00CC99] bg-white px-6 py-4 text-center text-[15px] font-bold text-[#00CC99] transition hover:bg-[#F0FAF7] active:brightness-[0.98]"
              >
                {copy.skipLabel}
              </button>
              <button
                type="button"
                onClick={() => setLinkStep("method")}
                className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#00CC99] px-6 py-4 text-center text-[15px] font-bold text-white shadow-none transition hover:brightness-[0.98] active:brightness-[0.95]"
              >
                {copy.linkAccountLabel}
              </button>
            </div>
          </>
        ) : linkStep === "method" ? (
          <LinkMyCashbackMethodStep
            copy={copy.method}
            linkChannel={linkChannel}
            setLinkChannel={setLinkChannel}
            phoneLocal={phoneLocal}
            setPhoneLocal={setPhoneLocal}
            emailValue={emailValue}
            setEmailValue={setEmailValue}
            consentChecked={consentChecked}
            setConsentChecked={setConsentChecked}
            onBack={() => {
              setLinkStep("intro");
              setConsentChecked(false);
            }}
            onNext={goToVerifyStep}
          />
        ) : linkStep === "verify" ? (
          <LinkMyCashbackVerifyStep
            copy={copy.verify}
            linkChannel={linkChannel}
            phoneDigits={phoneDigitsForMask}
            emailValue={emailValue}
            otpInput={otpInput}
            setOtpInput={setOtpInput}
            resendSeconds={resendSeconds}
            onResend={onVerifyResend}
            submitting={verifySubmitting}
            onBack={() => {
              setLinkStep("method");
              setOtpInput("");
            }}
            onNext={onVerifyOtpSubmit}
          />
        ) : linkStep === "verify_success" ? (
          <LinkMyCashbackVerifySuccessStep
            copy={copy.verify}
            onContinue={goToAccountSetupAfterVerify}
            onEditCode={() => {
              setLinkStep("verify");
              setOtpInput("");
            }}
          />
        ) : null}
      </section>
    </div>
  );
}
