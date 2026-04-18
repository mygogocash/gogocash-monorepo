"use client";

import { LogoMark } from "@/components/brand/LogoMark";
import { useTranslations } from "next-intl";

const MINT = "#00CC99";

/**
 * Top of every Account Setup step: logo → mint "Account Setup" heading → subtitle
 * → PromptPay badge. Kept in one place so every sub-flow starts visually identical.
 *
 * `headingId` lets each step wire its own `aria-labelledby` on the form below.
 */
export function AccountSetupHeader({ headingId }: { headingId: string }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
      <LogoMark />
      <div className="flex flex-col gap-2">
        <h1
          id={headingId}
          className="text-[34px] font-semibold leading-tight tracking-tight"
          style={{ color: MINT }}
        >
          {t("accountSetupTitle")}
        </h1>
        <p className="text-[15px] leading-relaxed text-[#5B6B61]">{t("accountSetupSubtitle")}</p>
      </div>
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
