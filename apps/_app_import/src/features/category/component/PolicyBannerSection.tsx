"use client";

import { useLocale } from "next-intl";
import { useCategoryPolicy, pickPolicyText } from "../hooks/useCategoryPolicy";
import { isCategoryPolicyTermsEnabled } from "@/lib/env";

/**
 * Renders the admin-authored banner caption for a category, picked for
 * the current user locale via the `pickPolicyText` fallback chain.
 * Plain text, single short line typically (BA3 in
 * docs/POLICY_MULTILANG_PLAN.md — admin caps at 500 chars per locale).
 *
 * Hidden when:
 *   - feature flag NEXT_PUBLIC_CATEGORY_POLICY_TERMS is off
 *     (same flag as terms; BA1 — one switch covers both)
 *   - no categoryId is resolvable
 *   - the policy fetch returned null (no policy authored)
 *   - the banner block is missing OR all banner translations are empty
 *
 * Mount above the offer grid on /category/[name] — see List.tsx.
 */
export default function PolicyBannerSection({
  categoryId,
}: {
  categoryId: string | null | undefined;
}) {
  const userLocale = useLocale();
  const enabled = isCategoryPolicyTermsEnabled();
  const { data: policy } = useCategoryPolicy(enabled ? categoryId : null);

  if (!enabled) return null;
  const text = pickPolicyText(policy?.banner, userLocale);
  if (!text) return null;

  return (
    <section aria-label="Category banner" className="gc-home-section-y w-full">
      <div className="rounded-2xl border border-(--gc-border) bg-(--gc-surface-muted) px-4 py-3 text-sm leading-relaxed text-(--gc-text-soft)">
        {text}
      </div>
    </section>
  );
}
