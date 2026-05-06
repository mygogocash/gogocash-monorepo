/**
 * V1 — legacy single-translation document. Kept for the dual-read shim so
 * any V1 row that survived the Phase-1 cutover is rendered correctly in the
 * editor. New saves write V2.
 */
export type PolicyDocumentV1 = {
  v: 1;
  primary: string;
  translation?: string;
  /** BCP-47-ish tag for admin-entered translation, e.g. th */
  translationLocale?: string;
  contentSource?: "template" | "template_plus" | "custom";
  templateId?: string | null;
  /** Preserved for “template + additions” round-trip in the editor */
  additionalTerms?: string;
};

/**
 * V2 — multi-language. One document per category-block (banner OR terms).
 * Locale-keyed `translations` map; `primary_locale` marks the canonical
 * source language. Shape mirrors `PolicyContent` on the NestJS side
 * (see gogocash_api/src/policy/schemas/policy.schema.ts).
 */
export type PolicyDocumentV2 = {
  v: 2;
  primary_locale: string;
  translations: Record<string, string>;
  content_source?: "template" | "template_plus" | "custom";
  template_id?: string | null;
  /** Per-locale "additional terms" — same locale keys as `translations`. */
  additional_terms?: Record<string, string>;
};

/** Parsed shape used by the editor. Always represents V2 internally;
 *  `parseStoredPolicy` converts V1 rows on read. */
export type ParsedPolicy = {
  primary_locale: string;
  translations: Record<string, string>;
  contentSource: PolicyDocumentV1["contentSource"];
  templateId: string | null;
  additionalTerms: Record<string, string>;
};

export type PolicyTemplate = {
  id: string;
  title: string;
  description: string;
  body: string;
};

/** Allow-list of locales the editor accepts. MUST mirror
 *  ALLOWED_POLICY_LOCALES in gogocash_api/src/policy/schemas/policy.schema.ts —
 *  the backend rejects writes with locales not in its list. */
export const POLICY_TRANSLATION_LOCALES: { value: string; label: string }[] = [
  { value: "th", label: "Thai (ไทย)" },
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
];

const POLICY_LOCALE_KEYS = POLICY_TRANSLATION_LOCALES.map((l) => l.value);

/** Empty-state factory — used when opening the editor for a category
 *  that has no policy document yet. */
export function emptyParsedPolicy(): ParsedPolicy {
  return {
    primary_locale: "th",
    translations: {},
    contentSource: "custom",
    templateId: null,
    additionalTerms: {},
  };
}

export const DEFAULT_POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: "standard_rewards",
    title: "Standard — offers & cashback",
    description: "General wording for reward and offer participation.",
    body: `By participating in offers in this category, you agree that:
• Rewards are subject to advertiser approval and may take time to confirm.
• GoGoCash may update these terms; continued use means you accept changes.
• Misuse, fraud, or manipulation may result in forfeited rewards and account action.

For questions, contact support through the app.`,
  },
  {
    id: "shopping_retail",
    title: "Shopping & retail",
    description: "Purchases, receipts, and retail-style offers.",
    body: `Shopping offer terms:
• Qualifying purchases must meet advertiser requirements (amount, retailer, time window).
• Keep proof of purchase until your reward is confirmed.
• Returns or chargebacks may void pending rewards.
• Not all items or categories may qualify; see offer details.`,
  },
  {
    id: "gaming_apps",
    title: "Gaming & apps",
    description: "Install, level-up, or in-app engagement offers.",
    body: `Gaming / app offer terms:
• Complete the steps shown in the offer (install, registration, level, etc.) using a new account where required.
• Use of VPNs, emulators, or duplicate accounts may disqualify you.
• Rewards track after the advertiser confirms your milestone.`,
  },
  {
    id: "minimal",
    title: "Minimal",
    description: "Short disclosure only — expand in “custom” or additions.",
    body: `Participation is subject to each offer’s rules and GoGoCash’s general terms of use.`,
  },
];

/**
 * Read a stored policy block (banner OR terms) into the editor's V2 shape.
 * Inputs we accept (priority order):
 *   1. New backend response — `PolicyContent` object from
 *      `GET /policy/category/:id` with `primary_locale` + `translations`.
 *   2. Legacy V1 JSON string with `v:1, primary, translation?, translationLocale?`.
 *      Surfaces as `translations: { [translationLocale]: translation, [primary_locale]: primary }`.
 *   3. Plain string with no JSON — treated as a TH-default custom text.
 */
export function parseStoredPolicy(raw: string | unknown): ParsedPolicy {
  // Path 1 — V2 object from the new backend.
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (
      typeof o.primary_locale === "string" &&
      o.translations &&
      typeof o.translations === "object"
    ) {
      const translations = o.translations as Record<string, string>;
      return {
        primary_locale: o.primary_locale,
        translations: { ...translations },
        contentSource: normaliseContentSource(o.content_source),
        templateId: typeof o.template_id === "string" ? o.template_id : null,
        additionalTerms:
          o.additional_terms && typeof o.additional_terms === "object"
            ? { ...(o.additional_terms as Record<string, string>) }
            : {},
      };
    }
  }

  if (typeof raw !== "string") return emptyParsedPolicy();
  const trimmed = raw.trim();

  // Path 2 — V1 JSON shim: synthesise a translations map from the single
  // (primary, translation, translationLocale) triple. Older docs surface
  // as a working V2 row in the editor; the next save writes V2 over it.
  if (trimmed.startsWith("{")) {
    try {
      const o = JSON.parse(trimmed) as Record<string, unknown>;
      if (o && o.v === 1 && typeof o.primary === "string") {
        const v1 = o as PolicyDocumentV1;
        const primaryLocale =
          typeof v1.translationLocale === "string" && v1.translation
            ? "en" // assume V1 translation was localised, primary was source
            : "th";
        const translations: Record<string, string> = {};
        if (v1.primary) translations[primaryLocale] = v1.primary;
        if (typeof v1.translation === "string" && v1.translation.trim() && v1.translationLocale) {
          translations[v1.translationLocale] = v1.translation;
        }
        return {
          primary_locale: primaryLocale,
          translations,
          contentSource: normaliseContentSource(v1.contentSource),
          templateId: typeof v1.templateId === "string" ? v1.templateId : null,
          additionalTerms:
            typeof v1.additionalTerms === "string" && v1.additionalTerms
              ? { [primaryLocale]: v1.additionalTerms }
              : {},
        };
      }
    } catch {
      /* treat as plain text */
    }
  }

  // Path 3 — plain text or template_plus split.
  const split = trySplitTemplatePlus(raw);
  if (split.additional) {
    const tmpl = DEFAULT_POLICY_TEMPLATES.find((t) => t.body.trim() === split.base.trim());
    if (tmpl) {
      return {
        primary_locale: "th",
        translations: { th: raw },
        contentSource: "template_plus",
        templateId: tmpl.id,
        additionalTerms: { th: split.additional },
      };
    }
  }
  return {
    primary_locale: "th",
    translations: raw ? { th: raw } : {},
    contentSource: "custom",
    templateId: null,
    additionalTerms: {},
  };
}

function normaliseContentSource(
  v: unknown,
): PolicyDocumentV1["contentSource"] {
  return v === "template" || v === "template_plus" || v === "custom" ? v : "custom";
}

/** Best-effort split when legacy saves used composeTemplatePlus separator. */
function trySplitTemplatePlus(primary: string): { base: string; additional: string } {
  const sep = "\n\n--- Additional terms ---\n\n";
  const i = primary.indexOf(sep);
  if (i === -1) return { base: primary, additional: "" };
  return { base: primary.slice(0, i), additional: primary.slice(i + sep.length) };
}

/** Strip empty translations + apply per-locale length cap. Mirrors the
 *  backend's normalisation in PolicyService so the wire payload matches
 *  what the database will store. */
export function buildPolicyContentForSave(payload: ParsedPolicy): {
  primary_locale: string;
  translations: Record<string, string>;
  content_source: "template" | "template_plus" | "custom";
  template_id?: string | null;
  additional_terms?: Record<string, string>;
} {
  const translations: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload.translations || {})) {
    if (typeof v === "string" && v.trim().length > 0) {
      translations[k] = v.slice(0, 50000);
    }
  }

  // For template_plus: append the per-locale additional_terms block to each
  // existing translation so the rendered text on the customer side matches
  // what the admin authored.
  const isTemplatePlus = payload.contentSource === "template_plus";
  const additional: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload.additionalTerms || {})) {
    if (typeof v === "string" && v.trim().length > 0) {
      additional[k] = v;
    }
  }

  return {
    primary_locale: payload.primary_locale || "th",
    translations,
    content_source: payload.contentSource ?? "custom",
    template_id:
      payload.contentSource === "template" ||
      payload.contentSource === "template_plus"
        ? payload.templateId
        : null,
    additional_terms: isTemplatePlus && Object.keys(additional).length > 0 ? additional : undefined,
  };
}

type PolicyContentWire = ReturnType<typeof buildPolicyContentForSave>;

/**
 * Build the wire payload for `PUT /policy`. Centralises the rule that
 * empty banner / terms blocks are omitted (rather than sent as nulls)
 * so the backend doesn't clobber the other side's existing content
 * when the admin only edits one block at a time.
 *
 * Backend contract (gogocash_api/src/policy/policy.controller.ts):
 *   PUT /policy { category_id, banner?, terms? }
 *
 * Phase 3A.1 of POLICY_MULTILANG_PLAN.md — extracted from PolicyTable
 * so the wire shape is testable as a pure function.
 */
export function buildSavePayload(input: {
  categoryId: string;
  bannerParsed?: ParsedPolicy;
  termsParsed?: ParsedPolicy;
}): {
  category_id: string;
  banner?: PolicyContentWire;
  terms?: PolicyContentWire;
} {
  const out: {
    category_id: string;
    banner?: PolicyContentWire;
    terms?: PolicyContentWire;
  } = { category_id: input.categoryId };
  if (input.bannerParsed) {
    out.banner = buildPolicyContentForSave(input.bannerParsed);
  }
  if (input.termsParsed) {
    out.terms = buildPolicyContentForSave(input.termsParsed);
  }
  return out;
}

/** Total character footprint across all locales — used for the editor's
 *  "are we within the storage cap" guard. The backend caps each locale
 *  at 50k independently, so this is just a UX hint. */
export function totalTranslationLength(translations: Record<string, string>): number {
  return Object.values(translations || {}).reduce(
    (sum, v) => sum + (typeof v === "string" ? v.length : 0),
    0,
  );
}

export function getTemplateById(id: string | null | undefined): PolicyTemplate | undefined {
  if (!id) return undefined;
  return DEFAULT_POLICY_TEMPLATES.find((t) => t.id === id);
}

/**
 * Resolve a template's body for a given user locale.
 *
 * Today every template only has English content (see DEFAULT_POLICY_TEMPLATES);
 * calling this with any locale returns that EN body. The signature is
 * deliberately locale-aware so when marketing supplies translations (BB3 in
 * docs/POLICY_MULTILANG_PLAN.md) we can extend the data shape without
 * touching any caller — they already pass a locale.
 *
 * Fallback chain (today: trivial; future: full):
 *   1. template.body[locale]   ← when bodies become locale-keyed
 *   2. template.body[en]       ← canonical international fallback (BB1)
 *   3. ""                       ← unknown template id
 *
 * @param id     template id (or null/undefined → "")
 * @param locale BCP-47 locale code (currently informational only)
 */
// `locale` is reserved for future locale-keyed bodies; see BB1/BB3 in
// POLICY_MULTILANG_PLAN.md. Underscore prefix marks it unused-on-purpose
// so neither callers nor lint complain when the data shape stays EN-only.
export function getTemplateBody(
  id: string | null | undefined,
  _locale: string,
): string {
  if (!id) return "";
  const tmpl = DEFAULT_POLICY_TEMPLATES.find((t) => t.id === id);
  return tmpl?.body ?? "";
}

export function composeTemplatePlus(templateBody: string, additional: string): string {
  const add = additional.trim();
  if (!add) return templateBody.trim();
  return `${templateBody.trim()}\n\n--- Additional terms ---\n\n${add}`;
}
