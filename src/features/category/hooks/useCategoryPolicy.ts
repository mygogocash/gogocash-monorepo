"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/axios/client";

/**
 * Shape returned by `GET /policy/category/:id`. Mirrors
 * `gogocash_api/src/policy/schemas/policy.schema.ts`. Both `banner` and
 * `terms` are optional — a category may have only one block authored.
 */
export type PolicyContent = {
  primary_locale: string;
  translations: Record<string, string>;
  content_source?: "template" | "template_plus" | "custom";
  template_id?: string | null;
  additional_terms?: Record<string, string>;
};

export type CategoryPolicy = {
  _id?: string;
  category_id: string;
  banner?: PolicyContent;
  terms?: PolicyContent;
};

/**
 * Public read — fetches the policy document for a category. Returns null
 * when the category has no policy authored yet (the renderer treats null
 * as "section hidden").
 *
 * Cached for 5 minutes; policies change rarely, so this avoids hammering
 * the API when the user navigates between offers within the same category.
 */
export function useCategoryPolicy(categoryId: string | null | undefined) {
  return useQuery<CategoryPolicy | null>({
    queryKey: ["categoryPolicy", categoryId],
    queryFn: () =>
      categoryId
        ? fetcher(`/policy/category/${encodeURIComponent(categoryId)}`)
        : Promise.resolve(null),
    enabled: Boolean(categoryId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Soft-fail so the rest of the page renders even if the policy endpoint
    // is down (Phase 1 backend may not yet be deployed in every env).
    retry: false,
  });
}

/**
 * Resolve the right text to display for a given user locale. Fallback chain:
 *   1. user's actual locale
 *   2. policy's primary_locale (admin-marked canonical source)
 *   3. Thai (the primary market default)
 *   4. English (international fallback)
 *   5. "" → renderer hides the section
 */
export function pickPolicyText(content: PolicyContent | undefined, userLocale: string): string {
  if (!content?.translations) return "";
  const tr = content.translations;
  return tr[userLocale] ?? tr[content.primary_locale] ?? tr.th ?? tr.en ?? "";
}
