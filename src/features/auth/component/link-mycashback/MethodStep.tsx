"use client";

import { AuthPrivacyConsentField } from "@/features/auth/component/AuthPrivacyConsentField";
import { phoneLocalDigitsFromInput } from "@/lib/link-mycashback/utils";
import { cn } from "@/lib/utils";
import type { LinkMyCashbackMethodStepProps } from "./types";

export function LinkMyCashbackMethodStep({
  copy,
  linkChannel,
  setLinkChannel,
  phoneLocal,
  setPhoneLocal,
  emailValue,
  setEmailValue,
  consentChecked,
  setConsentChecked,
  onBack,
  onNext,
}: LinkMyCashbackMethodStepProps) {
  const {
    methodTitle,
    methodDescription,
    methodPhoneLabel,
    methodEmailLabel,
    methodPhonePlaceholder,
    methodEmailPlaceholder,
    methodConsentPrefix,
    privacyPolicyLabel,
    methodBack,
    methodNext,
  } = copy;

  const linkPhoneDigits = phoneLocal.replace(/\D/g, "");

  return (
    <div className="mt-10 flex w-full flex-col items-center gap-6">
      <div className="flex w-full flex-col gap-1 text-left">
        <h2
          id="link-mycashback-method-heading"
          className="text-base font-medium leading-normal text-[#3B3B3B]"
          aria-describedby="link-mycashback-method-desc"
        >
          {methodTitle}
        </h2>
        <p
          id="link-mycashback-method-desc"
          className="text-sm font-normal leading-normal text-[#7F7F7F]"
        >
          {methodDescription}
        </p>
      </div>

      <fieldset
        className="flex w-full min-w-0 flex-col gap-4 border-0 p-0"
        aria-labelledby="link-mycashback-method-heading"
      >
        <div className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2 rounded-sm focus-within:ring-2 focus-within:ring-[#00CC99]/40 focus-within:ring-offset-2">
            <input
              type="radio"
              name="link-mycashback-channel"
              checked={linkChannel === "phone"}
              onChange={() => setLinkChannel("phone")}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                linkChannel === "phone"
                  ? "border-[#00CC99] bg-[#00CC99]"
                  : "border-[#989898] bg-white"
              )}
            >
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full bg-white transition-opacity",
                  linkChannel === "phone" ? "opacity-100" : "opacity-0"
                )}
              />
            </span>
            <span className="text-base font-normal text-[#3B3B3B]">{methodPhoneLabel}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-sm focus-within:ring-2 focus-within:ring-[#00CC99]/40 focus-within:ring-offset-2">
            <input
              type="radio"
              name="link-mycashback-channel"
              checked={linkChannel === "email"}
              onChange={() => setLinkChannel("email")}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                linkChannel === "email"
                  ? "border-[#00CC99] bg-[#00CC99]"
                  : "border-[#989898] bg-white"
              )}
            >
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full bg-white transition-opacity",
                  linkChannel === "email" ? "opacity-100" : "opacity-0"
                )}
              />
            </span>
            <span className="text-base font-normal text-[#3B3B3B]">{methodEmailLabel}</span>
          </label>
        </div>

        {linkChannel === "phone" ? (
          <div className="flex w-full gap-2">
            <div className="flex shrink-0 items-center rounded-2xl border border-[#A9A9A9]/50 px-4 py-3 text-base text-[#3B3B3B]">
              +66
            </div>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phoneLocal}
              onChange={(e) => setPhoneLocal(phoneLocalDigitsFromInput(e.target.value))}
              placeholder={methodPhonePlaceholder}
              className="min-h-[56px] min-w-0 flex-1 rounded-2xl border border-[#989898]/40 bg-white px-4 text-base text-[#3B3B3B] outline-none placeholder:text-[#7F7F7F] focus-visible:ring-2 focus-visible:ring-[#00CC99]/40"
            />
          </div>
        ) : (
          <input
            type="email"
            autoComplete="email"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder={methodEmailPlaceholder}
            className="min-h-[56px] w-full rounded-2xl border border-[#989898]/40 bg-white px-4 text-base text-[#3B3B3B] outline-none placeholder:text-[#7F7F7F] focus-visible:ring-2 focus-visible:ring-[#00CC99]/40"
          />
        )}

        <AuthPrivacyConsentField
          id="link-mycashback-privacy-checkbox"
          checked={consentChecked}
          onCheckedChange={setConsentChecked}
          leadText={methodConsentPrefix}
          policyLabel={privacyPolicyLabel}
        />
      </fieldset>

      <div className="flex w-full justify-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 w-[144px] shrink-0 items-center justify-center rounded-full border border-[#00CC99] bg-white px-3 text-xs font-medium text-[#00CC99] transition hover:bg-[#F0FAF7]"
        >
          {methodBack}
        </button>
        <button
          type="button"
          disabled={
            !consentChecked ||
            (linkChannel === "phone" ? linkPhoneDigits.length < 9 : emailValue.trim().length === 0)
          }
          onClick={onNext}
          className="flex h-12 w-[144px] shrink-0 items-center justify-center rounded-full bg-[#F6F6F6] px-3 text-xs font-medium text-[#989898] disabled:cursor-not-allowed disabled:opacity-90 enabled:bg-[#00CC99] enabled:text-white enabled:hover:brightness-[0.98]"
        >
          {methodNext}
        </button>
      </div>
    </div>
  );
}
