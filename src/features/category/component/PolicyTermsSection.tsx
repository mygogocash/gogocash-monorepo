"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCategoryPolicy, pickPolicyText } from "../hooks/useCategoryPolicy";
import { isCategoryPolicyTermsEnabled } from "@/lib/env";

/**
 * Renders the admin-authored terms & conditions for a category, picked
 * for the current user locale via the fallback chain documented in
 * `useCategoryPolicy.pickPolicyText`. Plain text only (Phase 3 ships
 * without rich-text per D7 in docs/POLICY_MULTILANG_PLAN.md).
 *
 * Hidden when:
 *   - feature flag NEXT_PUBLIC_CATEGORY_POLICY_TERMS is off
 *   - no categoryId is resolvable
 *   - the policy fetch returned null (no policy authored)
 *   - all translations are empty (unlikely — backend rejects this on save)
 */
export default function PolicyTermsSection({
  categoryId,
}: {
  categoryId: string | null | undefined;
}) {
  const t = useTranslations();
  const userLocale = useLocale();
  const enabled = isCategoryPolicyTermsEnabled();
  const { data: policy } = useCategoryPolicy(enabled ? categoryId : null);

  if (!enabled) return null;
  const text = pickPolicyText(policy?.terms, userLocale);
  if (!text) return null;

  return (
    <section
      aria-labelledby="category-policy-terms-heading"
      className="gc-home-section-y w-full"
    >
      <details className="rounded-2xl border border-(--gc-border) bg-white p-4 shadow-sm dark:bg-white/[0.03]">
        <summary
          id="category-policy-terms-heading"
          className="cursor-pointer select-none text-base font-semibold text-(--gc-text)"
        >
          {t("categoryPolicyTermsTitle")}
        </summary>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-(--gc-text-soft)">
          {text}
        </div>
      </details>
    </section>
  );
}
