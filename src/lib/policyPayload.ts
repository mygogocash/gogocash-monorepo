/** Stored policy document when translation or metadata is present (backward-compatible with plain string). */
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

export type ParsedPolicy = {
  primary: string;
  translation: string;
  translationLocale: string;
  contentSource: PolicyDocumentV1["contentSource"];
  templateId: string | null;
  additionalTerms: string;
};

export type PolicyTemplate = {
  id: string;
  title: string;
  description: string;
  body: string;
};

export const POLICY_TRANSLATION_LOCALES: { value: string; label: string }[] = [
  { value: "th", label: "Thai (ไทย)" },
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
];

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

export function parseStoredPolicy(raw: string): ParsedPolicy {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const o = JSON.parse(trimmed) as Record<string, unknown>;
      if (o && o.v === 1 && typeof o.primary === "string") {
        const doc = o as PolicyDocumentV1;
        return {
          primary: doc.primary,
          translation: typeof doc.translation === "string" ? doc.translation : "",
          translationLocale:
            typeof doc.translationLocale === "string" ? doc.translationLocale : "th",
          contentSource:
            doc.contentSource === "template" ||
            doc.contentSource === "template_plus" ||
            doc.contentSource === "custom"
              ? doc.contentSource
              : "custom",
          templateId:
            typeof doc.templateId === "string"
              ? doc.templateId
              : doc.templateId === null
                ? null
                : null,
          additionalTerms:
            typeof doc.additionalTerms === "string" ? doc.additionalTerms : "",
        };
      }
    } catch {
      /* treat as plain text */
    }
  }
  const split = trySplitTemplatePlus(raw);
  if (split.additional) {
    const tmpl = DEFAULT_POLICY_TEMPLATES.find((t) => t.body.trim() === split.base.trim());
    if (tmpl) {
      return {
        primary: raw,
        translation: "",
        translationLocale: "th",
        contentSource: "template_plus",
        templateId: tmpl.id,
        additionalTerms: split.additional,
      };
    }
  }
  return {
    primary: raw,
    translation: "",
    translationLocale: "th",
    contentSource: "custom",
    templateId: null,
    additionalTerms: "",
  };
}

/** Best-effort split when legacy saves used composeTemplatePlus separator. */
function trySplitTemplatePlus(primary: string): { base: string; additional: string } {
  const sep = "\n\n--- Additional terms ---\n\n";
  const i = primary.indexOf(sep);
  if (i === -1) return { base: primary, additional: "" };
  return { base: primary.slice(0, i), additional: primary.slice(i + sep.length) };
}

export function serializePolicyForSave(payload: {
  primary: string;
  translation: string;
  translationLocale: string;
  contentSource: ParsedPolicy["contentSource"];
  templateId: string | null;
  additionalTerms: string;
}): string {
  const translation = payload.translation.trim();
  const hasTranslation = translation.length > 0;
  const isTemplatePlus = payload.contentSource === "template_plus";
  const needsJson = hasTranslation || isTemplatePlus;

  let primary = payload.primary.slice(0, 50000).trimEnd();
  if (isTemplatePlus) {
    const tmpl = getTemplateById(payload.templateId);
    if (tmpl) {
      primary = composeTemplatePlus(tmpl.body, payload.additionalTerms).slice(0, 50000).trimEnd();
    }
  }

  if (!needsJson) {
    return primary;
  }

  const doc: PolicyDocumentV1 = {
    v: 1,
    primary,
    translationLocale: payload.translationLocale || "th",
    contentSource: payload.contentSource ?? "custom",
    templateId: payload.templateId,
  };
  if (hasTranslation) {
    doc.translation = translation;
  }
  if (isTemplatePlus) {
    doc.additionalTerms = payload.additionalTerms;
  }
  return JSON.stringify(doc);
}

export function getTemplateById(id: string | null | undefined): PolicyTemplate | undefined {
  if (!id) return undefined;
  return DEFAULT_POLICY_TEMPLATES.find((t) => t.id === id);
}

export function composeTemplatePlus(templateBody: string, additional: string): string {
  const add = additional.trim();
  if (!add) return templateBody.trim();
  return `${templateBody.trim()}\n\n--- Additional terms ---\n\n${add}`;
}
