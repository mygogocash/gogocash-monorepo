/**
 * PDPA cookie banner: ensure keys exist even if a locale file is stale or partially loaded
 * (mirrors `headerSearchMerge.ts`).
 */
export const PDPA_CONSENT_BANNER_MESSAGE_KEYS = [
  "pdpaConsentBannerTitle",
  "pdpaConsentBannerBodyPart1",
  "pdpaConsentBannerBodyMid",
  "pdpaConsentBannerBodyPart2",
  "pdpaConsentDecline",
  "pdpaConsentAllow",
] as const;

const FALLBACK_EN: Record<(typeof PDPA_CONSENT_BANNER_MESSAGE_KEYS)[number], string> = {
  pdpaConsentBannerTitle: "We use cookies in the delivery of our services.",
  pdpaConsentBannerBodyPart1: "To learn about the cookies we use and your preferences, read our ",
  pdpaConsentBannerBodyMid: "",
  pdpaConsentBannerBodyPart2:
    ". By using GoGoCash you agree to our use of cookies for cashback and analytics.",
  pdpaConsentDecline: "Cookie settings",
  pdpaConsentAllow: "Accept all cookies",
};

const FALLBACK_TH: Record<(typeof PDPA_CONSENT_BANNER_MESSAGE_KEYS)[number], string> = {
  pdpaConsentBannerTitle: "เราใช้คุกกี้ในการให้บริการของเรา",
  pdpaConsentBannerBodyPart1: "หากต้องการทราบเกี่ยวกับคุกกี้และการตั้งค่าของคุณ โปรดอ่าน ",
  pdpaConsentBannerBodyMid: "",
  pdpaConsentBannerBodyPart2:
    " เมื่อใช้ GoGoCash ถือว่าคุณยอมรับการใช้คุกกี้เพื่อแคชแบ็กและการวิเคราะห์",
  pdpaConsentDecline: "ตั้งค่าคุกกี้",
  pdpaConsentAllow: "ยอมรับคุกกี้ทั้งหมด",
};

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function mergePdpaConsentBannerMessages(
  base: Record<string, unknown>,
  catalog: "en" | "th"
): Record<string, unknown> {
  const fallbacks = catalog === "th" ? FALLBACK_TH : FALLBACK_EN;
  const out: Record<string, unknown> = { ...base };
  for (const key of PDPA_CONSENT_BANNER_MESSAGE_KEYS) {
    if (isMissing(out[key])) {
      out[key] = fallbacks[key];
    }
  }
  return out;
}

/** Same strings as merge fallbacks — use in `ConsentBanner` so copy never depends on `next-intl` message resolution (avoids Turbopack MISSING_MESSAGE noise). */
export type PdpaConsentBannerCopy = {
  title: string;
  bodyPart1: string;
  bodyPart2: string;
  decline: string;
  allow: string;
  /** Same text as `footerPrivacyPolicy` in locale files */
  privacyPolicyLabel: string;
};

export function getPdpaConsentBannerCopy(catalog: "en" | "th"): PdpaConsentBannerCopy {
  const f = catalog === "th" ? FALLBACK_TH : FALLBACK_EN;
  return {
    title: f.pdpaConsentBannerTitle,
    bodyPart1: f.pdpaConsentBannerBodyPart1,
    bodyPart2: f.pdpaConsentBannerBodyPart2,
    decline: f.pdpaConsentDecline,
    allow: f.pdpaConsentAllow,
    privacyPolicyLabel: catalog === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy",
  };
}
