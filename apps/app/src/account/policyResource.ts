import type { Locale } from "@mobile/i18n/locales";
import type { AccountDataSource } from "@mobile/auth/routeGuard";

export type BackendCategoryPolicyPayload = {
  category_id?: string;
  terms?: {
    primary_locale?: string;
    translations?: Record<string, string>;
  };
};

export type CategoryPolicyPayload = BackendCategoryPolicyPayload;

export type ShopTermsViewModel = {
  bullets: readonly string[];
  /**
   * #466 — admin custom_terms freeform body. When set, the shop T&Cs panel
   * renders this as plain text (no auto bullet markers).
   */
  body?: string;
  eyebrow: string;
  exclusionsTitle: string;
  subtitle: string;
  title: string;
};

export type MappedCategoryPolicy = {
  bullets: string[];
  termsText: string;
};

function pickPolicyTranslation(
  translations: Record<string, string> | undefined,
  locale: Locale = "en",
): string {
  if (!translations) {
    return "";
  }

  const preferred = translations[locale]?.trim();
  if (preferred) {
    return preferred;
  }

  const english = translations.en?.trim();
  if (english) {
    return english;
  }

  const first = Object.values(translations).find((value) => value.trim().length > 0);
  return first?.trim() ?? "";
}

export function splitPolicyBullets(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function mapBackendCategoryPolicy(
  payload: BackendCategoryPolicyPayload | null | undefined,
  locale: Locale = "en",
): MappedCategoryPolicy | null {
  if (!payload?.terms) {
    return null;
  }

  const termsText = pickPolicyTranslation(payload.terms.translations, locale);
  if (!termsText) {
    return null;
  }

  return {
    bullets: splitPolicyBullets(termsText),
    termsText,
  };
}

export function resolveShopTermsBullets({
  customTerms,
  policyBullets,
  fixtureBullets,
}: {
  customTerms?: string | null;
  policyBullets?: readonly string[];
  fixtureBullets: readonly string[];
}): string[] {
  const trimmedCustom = customTerms?.trim();
  if (trimmedCustom) {
    return splitPolicyBullets(trimmedCustom);
  }

  if (policyBullets && policyBullets.length > 0) {
    return [...policyBullets];
  }

  return [...fixtureBullets];
}

export function resolvePolicyCategoryEndpoint(categoryId: string): string {
  return `/policy/category/${encodeURIComponent(categoryId)}`;
}

export function resolveShopTerms({
  customTerms,
  fallback,
  noteToUser,
  policyPayload,
  source,
  locale = "en",
}: {
  customTerms?: string | null;
  fallback: ShopTermsViewModel;
  noteToUser?: string | null;
  policyPayload: CategoryPolicyPayload | null | undefined;
  source: AccountDataSource;
  locale?: Locale;
}): ShopTermsViewModel {
  const trimmedCustom = customTerms?.trim();
  // #466 — custom terms are freeform (preserve newlines), not auto-bulleted.
  if (trimmedCustom) {
    return {
      ...fallback,
      body: trimmedCustom,
      bullets: [],
      subtitle: noteToUser?.trim() || fallback.subtitle,
    };
  }

  const policyBullets =
    source === "backend" ? mapBackendCategoryPolicy(policyPayload, locale)?.bullets : undefined;

  return {
    ...fallback,
    body: undefined,
    bullets: resolveShopTermsBullets({
      customTerms: null,
      fixtureBullets: fallback.bullets,
      policyBullets,
    }),
    subtitle: noteToUser?.trim() || fallback.subtitle,
  };
}
