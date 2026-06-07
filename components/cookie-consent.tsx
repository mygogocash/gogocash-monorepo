"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ALL_COOKIE_PREFERENCES,
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_OPEN_EVENT,
  DEFAULT_COOKIE_PREFERENCES,
  type CookieConsentPreferences,
  hasDecidedConsent,
  persistConsent,
  readConsent,
} from "@/lib/cookie-consent";
import {
  twFocusRingPrimary,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";
import { uiCtaPrimarySurface } from "@/lib/ui-classes";

type ConsentCopy = {
  title: string;
  body: string;
  privacy: string;
  acceptAll: string;
  rejectNonEssential: string;
  customize: string;
  preferencesTitle: string;
  preferencesBody: string;
  essentialTitle: string;
  essentialBody: string;
  alwaysOn: string;
  analyticsTitle: string;
  analyticsBody: string;
  marketingTitle: string;
  marketingBody: string;
  savePreferences: string;
  rejectAll: string;
};

// EN + Thai (issue #7, EN+TH scope). Other locales fall back to EN until
// translations are reviewed.
const COPY: Record<"en" | "th", ConsentCopy> = {
  en: {
    title: "Cookies & your privacy",
    body: "We use cookies to measure traffic and improve GoGoCash. Accept analytics & marketing cookies, or reject non-essential ones — essential cookies always stay on.",
    privacy: "Privacy Policy",
    acceptAll: "Accept all",
    rejectNonEssential: "Reject non-essential",
    customize: "Customize",
    preferencesTitle: "Cookie preferences",
    preferencesBody:
      "Choose which optional cookies GoGoCash can use. Essential cookies are always on so the site can work.",
    essentialTitle: "Essential cookies",
    essentialBody:
      "Required for privacy choices, routing, security, and basic site behavior.",
    alwaysOn: "Always on",
    analyticsTitle: "Analytics cookies",
    analyticsBody:
      "Help us measure visits and improve pages with Firebase Analytics and PostHog.",
    marketingTitle: "Marketing cookies",
    marketingBody:
      "Let us load marketing pixels such as LINE Tag for campaign measurement.",
    savePreferences: "Save preferences",
    rejectAll: "Reject all",
  },
  th: {
    title: "คุกกี้และความเป็นส่วนตัวของคุณ",
    body: "เราใช้คุกกี้เพื่อวัดการเข้าชมและปรับปรุง GoGoCash คุณสามารถยอมรับคุกกี้เพื่อการวิเคราะห์และการตลาด หรือปฏิเสธคุกกี้ที่ไม่จำเป็นได้ — คุกกี้ที่จำเป็นจะเปิดใช้งานเสมอ",
    privacy: "นโยบายความเป็นส่วนตัว",
    acceptAll: "ยอมรับทั้งหมด",
    rejectNonEssential: "ปฏิเสธที่ไม่จำเป็น",
    customize: "ปรับแต่ง",
    preferencesTitle: "ตั้งค่าคุกกี้",
    preferencesBody:
      "เลือกคุกกี้เพิ่มเติมที่ GoGoCash ใช้ได้ คุกกี้ที่จำเป็นจะเปิดใช้งานเสมอเพื่อให้เว็บไซต์ทำงานได้",
    essentialTitle: "คุกกี้ที่จำเป็น",
    essentialBody:
      "จำเป็นสำหรับการจดจำตัวเลือกความเป็นส่วนตัว การนำทาง ความปลอดภัย และการทำงานพื้นฐานของเว็บไซต์",
    alwaysOn: "เปิดเสมอ",
    analyticsTitle: "คุกกี้วิเคราะห์",
    analyticsBody:
      "ช่วยให้เราวัดการเข้าชมและปรับปรุงหน้าเว็บด้วย Firebase Analytics และ PostHog",
    marketingTitle: "คุกกี้การตลาด",
    marketingBody:
      "อนุญาตให้โหลดพิกเซลการตลาด เช่น LINE Tag เพื่อวัดผลแคมเปญ",
    savePreferences: "บันทึกการตั้งค่า",
    rejectAll: "ปฏิเสธทั้งหมด",
  },
};

const PRIVACY_HREF = "/privacy-policy";

/** Subscribe to consent decisions (external store) for `useSyncExternalStore`. */
function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
}

function defaultDraft(): CookieConsentPreferences {
  return { ...DEFAULT_COOKIE_PREFERENCES };
}

/**
 * PDPA/GDPR consent banner (#7). Opt-in: shows on first visit until the visitor
 * accepts, rejects, or saves custom preferences; choice persists. Re-opens as a
 * preference centre from the footer "Cookie Settings" link.
 */
export default function CookieConsent() {
  const pathname = usePathname();
  const t = pathname?.startsWith("/th") ? COPY.th : COPY.en;

  // Consent is an external store (localStorage + event); server renders nothing.
  const decided = useSyncExternalStore(
    subscribeConsent,
    () => hasDecidedConsent(),
    () => true,
  );
  const [forcedOpen, setForcedOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [draft, setDraft] = useState<CookieConsentPreferences>(defaultDraft);
  const acceptRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reopen = () => {
      setDraft(readConsent()?.preferences ?? defaultDraft());
      setShowPreferences(true);
      setForcedOpen(true);
    };
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, reopen);
  }, []);

  const visible = forcedOpen || !decided;

  useEffect(() => {
    if (!visible) return;
    if (showPreferences) saveRef.current?.focus();
    else acceptRef.current?.focus();
  }, [showPreferences, visible]);

  if (!visible) return null;

  const decide = (preferences: CookieConsentPreferences) => {
    persistConsent(preferences);
    setForcedOpen(false);
    setShowPreferences(false);
    setDraft(preferences);
  };

  const openPreferences = () => {
    setDraft(readConsent()?.preferences ?? defaultDraft());
    setShowPreferences(true);
  };

  const updateDraft = (
    key: keyof CookieConsentPreferences,
    checked: boolean,
  ) => {
    setDraft((current) => ({ ...current, [key]: checked }));
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-body"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:p-6">
        <h2
          id="cookie-consent-title"
          className="text-base font-bold text-gray-900"
        >
          {showPreferences ? t.preferencesTitle : t.title}
        </h2>
        <p
          id="cookie-consent-body"
          className="mt-2 text-sm leading-relaxed text-gray-600"
        >
          {showPreferences ? t.preferencesBody : t.body}{" "}
          <Link
            href={PRIVACY_HREF}
            className={`font-medium text-primary underline underline-offset-2 ${twFocusRingPrimary}`}
          >
            {t.privacy}
          </Link>
        </p>
        {showPreferences ? (
          <>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {t.essentialTitle}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      {t.essentialBody}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                    {t.alwaysOn}
                  </span>
                </div>
              </div>

              <label
                htmlFor="cookie-analytics"
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-300"
              >
                <input
                  id="cookie-analytics"
                  type="checkbox"
                  checked={draft.analytics}
                  onChange={(event) =>
                    updateDraft("analytics", event.currentTarget.checked)
                  }
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    {t.analyticsTitle}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-gray-600">
                    {t.analyticsBody}
                  </span>
                </span>
              </label>

              <label
                htmlFor="cookie-marketing"
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-300"
              >
                <input
                  id="cookie-marketing"
                  type="checkbox"
                  checked={draft.marketing}
                  onChange={(event) =>
                    updateDraft("marketing", event.currentTarget.checked)
                  }
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    {t.marketingTitle}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-gray-600">
                    {t.marketingBody}
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => decide(DEFAULT_COOKIE_PREFERENCES)}
                className={`inline-flex min-h-11 items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
              >
                {t.rejectAll}
              </button>
              <button
                type="button"
                ref={saveRef}
                onClick={() => decide(draft)}
                className={`inline-flex min-h-11 items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
              >
                {t.savePreferences}
              </button>
              <button
                type="button"
                onClick={() => decide(ALL_COOKIE_PREFERENCES)}
                className={`inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-sm ${uiCtaPrimarySurface} ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
              >
                {t.acceptAll}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => decide(DEFAULT_COOKIE_PREFERENCES)}
              className={`inline-flex min-h-11 items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
            >
              {t.rejectNonEssential}
            </button>
            <button
              type="button"
              onClick={openPreferences}
              className={`inline-flex min-h-11 items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
            >
              {t.customize}
            </button>
            <button
              type="button"
              ref={acceptRef}
              onClick={() => decide(ALL_COOKIE_PREFERENCES)}
              className={`inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-sm ${uiCtaPrimarySurface} ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
            >
              {t.acceptAll}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
