/**
 * Generic sample terms used to pre-fill an offer's Terms & Conditions editor
 * when neither a configured policy nor a category-specific default applies.
 * Admins edit this to fit the brand.
 */
export const OFFER_MOCK_TERMS = [
  "1. Cashback is credited only after the merchant confirms a completed, non-cancelled purchase — typically 30–90 days after the transaction.",
  "2. Eligible on qualifying products only. Taxes, shipping, gift cards, and returned or cancelled items are excluded.",
  "3. The cashback rate shown when you click through GoGoCash applies; rates may change without notice.",
  "4. Complete the purchase in a single session after clicking through GoGoCash, with cookies enabled and ad-blockers disabled.",
  "5. Cashback may not combine with certain third-party coupons or promo codes not listed on GoGoCash.",
  "6. GoGoCash may withhold or reverse cashback where fraud, abuse, or a breach of these terms is suspected.",
].join("\n");

/**
 * Per-category default sample T&C, keyed by lower-cased category name. Used to
 * pre-fill the editor with a full, category-flavoured starting point when the
 * category has no policy configured under Policy Management (mock data has none).
 */
export const CATEGORY_MOCK_TERMS: Record<string, string> = {
  shopping: [
    "1. Cashback applies to eligible retail purchases completed in a single session after clicking through GoGoCash.",
    "2. Returned, exchanged, or cancelled items are not eligible and any cashback earned will be reversed.",
    "3. Marketplace / third-party-seller items, gift cards, and shipping fees are excluded.",
    "4. Cashback is confirmed only after the store's return window closes (typically 30–60 days).",
    "5. Stacking with coupon sites or browser extensions not listed on GoGoCash may void cashback.",
    "6. The cashback rate shown at click time applies; rates may change without notice.",
  ].join("\n"),
  travel: [
    "1. Cashback applies to completed, non-cancelled bookings paid in full through the partner.",
    "2. Cashback is confirmed only after check-out / travel completion — not at the time of booking.",
    "3. Cancellations, no-shows, date changes, and refunded bookings forfeit cashback.",
    "4. Taxes, resort fees, insurance, and third-party add-ons are usually excluded.",
    "5. Bookings must be completed in a single session after clicking through GoGoCash.",
    "6. The cashback rate shown at click time applies; rates may change without notice.",
  ].join("\n"),
  "food & drink": [
    "1. Cashback applies to eligible, completed orders that are not cancelled or refunded.",
    "2. Delivery fees, service charges, tips, and taxes are excluded.",
    "3. Orders using promo codes or vouchers not listed on GoGoCash may be ineligible.",
    "4. Cashback is confirmed after the order is delivered and the dispute window closes.",
    "5. First-order-only or new-customer offers apply once per user / household.",
    "6. The cashback rate shown at click time applies; rates may change without notice.",
  ].join("\n"),
  finance: [
    "1. Cashback is paid only after the application is approved and all qualifying criteria are met.",
    "2. Approval is at the provider's sole discretion; declined or withdrawn applications earn nothing.",
    "3. Any stated minimum spend, funding, or activity requirement must be met within the stated window.",
    "4. One cashback per approved product per user; duplicate applications are excluded.",
    "5. Cashback can take 60–120 days to confirm while the provider verifies eligibility.",
    "6. The terms shown at click time apply; terms may change without notice.",
  ].join("\n"),
  entertainment: [
    "1. Cashback applies to eligible new subscriptions or ticket purchases completed via GoGoCash.",
    "2. Trials cancelled before billing, and refunded or transferred tickets, are excluded.",
    "3. Renewals and upgrades may not qualify unless explicitly stated.",
    "4. Cashback is confirmed after the refund / cancellation window closes.",
    "5. One cashback per user unless the offer states otherwise.",
    "6. The cashback rate shown at click time applies; rates may change without notice.",
  ].join("\n"),
  electronics: [
    "1. Cashback applies to eligible electronics purchases completed in a single session via GoGoCash.",
    "2. Returns, RMA exchanges, and cancelled orders are not eligible; cashback is reversed.",
    "3. Open-box, refurbished, marketplace, and bundle items may be excluded.",
    "4. Cashback is confirmed after the retailer / manufacturer return window closes (often 30–45 days).",
    "5. Price-match, staff, or coupon-stacked orders not listed on GoGoCash may void cashback.",
    "6. The cashback rate shown at click time applies; rates may change without notice.",
  ].join("\n"),
};

/** The category-specific default sample for a category name, or "" if unknown. */
export function categoryMockTerms(name: string | null | undefined): string {
  if (!name) return "";
  return CATEGORY_MOCK_TERMS[name.trim().toLowerCase()] ?? "";
}

export interface PolicyCategoryRef {
  _id: string;
  name: string;
}

/**
 * Resolves the base T&C text used to seed an offer's editable Terms & Conditions.
 * - `"custom"` → empty (the admin writes their own from scratch).
 * - a category id → that category's configured policy text.
 * - `""` (automatic) → the offer's own category (matched by name) policy text.
 * When no policy text is configured, falls back to the category-specific default
 * sample ({@link CATEGORY_MOCK_TERMS}), then the generic {@link OFFER_MOCK_TERMS}.
 */
export function resolveOfferPolicyBaseTerms(
  policyId: string,
  offerCategoryName: string | null | undefined,
  categories: PolicyCategoryRef[],
  policiesList: Record<string, string>,
): string {
  if (policyId === "custom") return "";

  let catId = policyId;
  let catName: string;
  if (catId) {
    catName = categories.find((c) => c._id === catId)?.name ?? "";
  } else {
    catName = offerCategoryName ?? "";
    catId = categories.find((c) => c.name === catName)?._id ?? "";
  }

  const configured = (catId ? (policiesList[catId] ?? "") : "").trim();
  return configured || categoryMockTerms(catName) || OFFER_MOCK_TERMS;
}
