"use client";

import { LogoMark } from "@/components/brand/LogoMark";
import { useTranslations } from "next-intl";

/**
 * Top of every Account Setup step: logo → mint heading → subtitle → PromptPay
 * badge. Centered to match the sign-in page's header treatment
 * (LoginComponent.tsx L547–556); `LogoMark` gets the same mobile shadow
 * ornament and clears it on `lg:`.
 *
 * `headingId` lets each step wire its own `aria-labelledby` on the form below.
 */
export function AccountSetupHeader({ headingId }: { headingId: string }) {
  const t = useTranslations();
  return (
    <div className="flex shrink-0 flex-col items-center gap-3 text-center">
      <LogoMark className="bg-[#fafafa] shadow-[0_4px_24px_rgba(0,0,0,0.06)] lg:bg-white lg:shadow-none" />
      <h1
        id={headingId}
        className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight text-[#00cc99] lg:text-[1.625rem]"
      >
        {t("accountSetupTitle")}
      </h1>
      <p className="text-sm leading-snug text-[#7f7f7f] lg:text-[13px]">
        {t("accountSetupSubtitle")}
      </p>
      <PromptPayBadge />
    </div>
  );
}

/**
 * PromptPay brand badge — text-based approximation of the official logo.
 * Drop `/public/images/promptpay-logo.svg` exported from Figma and swap this
 * to `<Image src="/images/promptpay-logo.svg" … />` for pixel parity.
 */
function PromptPayBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg border border-[#002F6C]/20 bg-white px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      aria-label="PromptPay"
    >
      <span className="text-[20px] font-bold text-[#002F6C]">Prompt</span>
      <span className="text-[20px] font-bold text-[#00A1D6]">Pay</span>
      <span className="text-[13px] font-semibold text-[#002F6C]" lang="th">
        พร้อมเพย์
      </span>
    </div>
  );
}
