"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_OPEN_EVENT,
  hasDecidedConsent,
  persistConsent,
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
  accept: string;
  reject: string;
};

// EN + Thai (issue #7, EN+TH scope). Other locales fall back to EN until
// translations are reviewed.
const COPY: Record<"en" | "th", ConsentCopy> = {
  en: {
    title: "Cookies & your privacy",
    body: "We use cookies to measure traffic and improve GoGoCash. Accept analytics & marketing cookies, or reject non-essential ones — essential cookies always stay on.",
    privacy: "Privacy Policy",
    accept: "Accept",
    reject: "Reject non-essential",
  },
  th: {
    title: "คุกกี้และความเป็นส่วนตัวของคุณ",
    body: "เราใช้คุกกี้เพื่อวัดการเข้าชมและปรับปรุง GoGoCash คุณสามารถยอมรับคุกกี้เพื่อการวิเคราะห์และการตลาด หรือปฏิเสธคุกกี้ที่ไม่จำเป็นได้ — คุกกี้ที่จำเป็นจะเปิดใช้งานเสมอ",
    privacy: "นโยบายความเป็นส่วนตัว",
    accept: "ยอมรับ",
    reject: "ปฏิเสธที่ไม่จำเป็น",
  },
};

const PRIVACY_HREF = "/privacy-policy";

/** Subscribe to consent decisions (external store) for `useSyncExternalStore`. */
function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
}

/**
 * PDPA/GDPR consent banner (#7). Opt-in: shows on first visit until the visitor
 * accepts or rejects; choice persists. Re-opens on the footer "Cookie Settings"
 * link via `COOKIE_CONSENT_OPEN_EVENT`. Trackers gate on the persisted decision.
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
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reopen = () => setForcedOpen(true);
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, reopen);
  }, []);

  const visible = forcedOpen || !decided;

  useEffect(() => {
    if (visible) acceptRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const decide = (accepted: boolean) => {
    persistConsent(accepted);
    setForcedOpen(false);
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
          {t.title}
        </h2>
        <p
          id="cookie-consent-body"
          className="mt-2 text-sm leading-relaxed text-gray-600"
        >
          {t.body}{" "}
          <Link
            href={PRIVACY_HREF}
            className={`font-medium text-primary underline underline-offset-2 ${twFocusRingPrimary}`}
          >
            {t.privacy}
          </Link>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => decide(false)}
            className={`inline-flex min-h-11 items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
          >
            {t.reject}
          </button>
          <button
            type="button"
            ref={acceptRef}
            onClick={() => decide(true)}
            className={`inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-sm ${uiCtaPrimarySurface} ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
