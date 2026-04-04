/**
 * Withdraw form + confirm step: ensure keys exist if locale JSON is stale (Turbopack HMR).
 * Mirrors `headerSearchMerge.ts` / `pdpaConsentBannerMerge.ts`.
 */
export const WITHDRAW_CTA_MESSAGE_KEYS = [
  "withdrawFormCtaTitle",
  "withdrawFormCtaSubtitle",
  "withdrawFormConfirmAndWithdraw",
  "withdrawConfirmGoToWalletButton",
  "withdrawConfirmContinueShopping",
  "withdrawConfirmReviewBadge",
] as const;

const FALLBACK_EN: Record<(typeof WITHDRAW_CTA_MESSAGE_KEYS)[number], string> = {
  withdrawFormCtaTitle: "Confirm",
  withdrawFormCtaSubtitle: "and withdraw",
  withdrawFormConfirmAndWithdraw: "Confirm and Withdraw",
  withdrawConfirmGoToWalletButton: "Go to Wallet",
  withdrawConfirmContinueShopping: "Continue Shopping",
  withdrawConfirmReviewBadge: "Pending",
};

const FALLBACK_TH: Record<(typeof WITHDRAW_CTA_MESSAGE_KEYS)[number], string> = {
  withdrawFormCtaTitle: "ยืนยัน",
  withdrawFormCtaSubtitle: "และถอนเงิน",
  withdrawFormConfirmAndWithdraw: "ยืนยันและถอนเงิน",
  withdrawConfirmGoToWalletButton: "ไปที่กระเป๋าเงิน",
  withdrawConfirmContinueShopping: "ช้อปต่อ",
  withdrawConfirmReviewBadge: "รอดำเนินการ",
};

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function mergeWithdrawCtaMessages(
  base: Record<string, unknown>,
  catalog: "en" | "th"
): Record<string, unknown> {
  const fallbacks = catalog === "th" ? FALLBACK_TH : FALLBACK_EN;
  const out: Record<string, unknown> = { ...base };
  for (const key of WITHDRAW_CTA_MESSAGE_KEYS) {
    if (isMissing(out[key])) {
      out[key] = fallbacks[key];
    }
  }
  return out;
}

/**
 * Two-line withdraw CTA (form step). Prefer this over `t("withdrawFormCtaTitle")` in client
 * components: Turbopack HMR can omit flat keys from `messages`, which still triggers
 * MISSING_MESSAGE even when `getMessageFallback` is set.
 */
export function getWithdrawFormCtaCopy(locale: string): { title: string; subtitle: string } {
  if (locale === "th") {
    return {
      title: FALLBACK_TH.withdrawFormCtaTitle,
      subtitle: FALLBACK_TH.withdrawFormCtaSubtitle,
    };
  }
  return {
    title: FALLBACK_EN.withdrawFormCtaTitle,
    subtitle: FALLBACK_EN.withdrawFormCtaSubtitle,
  };
}

/**
 * Confirm step: wallet / continue / status badge. Prefer over `t("withdrawConfirm…")` in client
 * components — Turbopack HMR can omit these flat keys from `messages`, which still triggers
 * `MISSING_MESSAGE` even when `getMessageFallback` is set on the provider.
 */
export function getWithdrawConfirmActionCopy(locale: string): {
  goToWallet: string;
  continueShopping: string;
  reviewBadge: string;
} {
  if (locale === "th") {
    return {
      goToWallet: FALLBACK_TH.withdrawConfirmGoToWalletButton,
      continueShopping: FALLBACK_TH.withdrawConfirmContinueShopping,
      reviewBadge: FALLBACK_TH.withdrawConfirmReviewBadge,
    };
  }
  return {
    goToWallet: FALLBACK_EN.withdrawConfirmGoToWalletButton,
    continueShopping: FALLBACK_EN.withdrawConfirmContinueShopping,
    reviewBadge: FALLBACK_EN.withdrawConfirmReviewBadge,
  };
}
