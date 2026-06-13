/** Shared pill styles — merchant summary tags (Figma 8345:118148 rail). */
export const merchantSummaryTagBase =
  "inline-flex max-w-full min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-left text-sm font-medium leading-snug shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:min-h-[2.5rem] sm:px-4 sm:text-[0.9375rem]";

/** Mirrors `merchantSummaryTagsAria` in message JSON when the client catalog is stale. */
export const MERCHANT_SUMMARY_TAGS_ARIA_FALLBACK: Record<string, string> = {
  en: "Offer highlights",
  th: "จุดเด่นของข้อเสนอ",
  jp: "オファーのハイライト",
};

export function getMerchantSummaryTagsAriaLabel(
  messages: Record<string, unknown>,
  locale: string
): string {
  const raw = messages.merchantSummaryTagsAria;
  if (typeof raw === "string") return raw;
  return (
    MERCHANT_SUMMARY_TAGS_ARIA_FALLBACK[locale] ??
    MERCHANT_SUMMARY_TAGS_ARIA_FALLBACK.en ??
    "Offer highlights"
  );
}

export function formatCouponCountdown(endDateIso: string, _tick: number): string | null {
  void _tick;
  const end = new Date(endDateIso).getTime();
  if (Number.isNaN(end)) return null;
  const diff = Math.max(0, end - Date.now());
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")} : ${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;
}
