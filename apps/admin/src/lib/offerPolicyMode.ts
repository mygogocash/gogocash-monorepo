export const CUSTOM_POLICY_CATEGORY_ID = "custom";

export type OfferPolicyMode = "template" | "custom";

export function inferOfferPolicyMode(
  policyCategoryId: string | null | undefined,
): OfferPolicyMode {
  return policyCategoryId?.trim() === CUSTOM_POLICY_CATEGORY_ID
    ? "custom"
    : "template";
}
