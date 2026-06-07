const DEFAULT_SITE_URL = "https://gogocash.co";
const DEFAULT_CUSTOMERIO_FORMS_SITE_ID = "be2d31cfc0387c58114c";
const DEFAULT_CUSTOMERIO_FORMS_BASE_URL = "https://customerioforms.com";

/** LINE Tag (LAP) — public id; override with NEXT_PUBLIC_LINE_TAG_ID or disable with empty string. */
const DEFAULT_LINE_TAG_ID = "d27ab1a2-5e67-48d0-af8d-ca6b30b67452";

const LINE_TAG_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_PUBLIC_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDrxKfICfS512IFSjfPomoFZSwy-D-vPZI",
  authDomain: "landing-page-4ae23.firebaseapp.com",
  projectId: "landing-page-4ae23",
  storageBucket: "landing-page-4ae23.firebasestorage.app",
  messagingSenderId: "110817639529",
  appId: "1:110817639529:web:7aa0d7da755797ecac76f8",
  measurementId: "G-847C4M51SE",
} as const;

export type PublicFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

function readTrimmedEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readValidFormFieldEnv(name: string, fallback: string): string {
  const value = readTrimmedEnv(name);
  if (!value) return fallback;
  return /^[A-Za-z0-9_.[\]-]{1,80}$/.test(value) ? value : fallback;
}

function readPublicIntegrationIdEnv(
  name: string,
  fallback: string,
): string | null {
  const raw = process.env[name];
  if (raw !== undefined && raw.trim() === "") return null;
  const value = raw?.trim() ?? fallback;
  return /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : null;
}

function firstValidUrl(candidates: Array<string | null>): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate).toString();
    } catch {
      /* try next candidate */
    }
  }
  return DEFAULT_SITE_URL;
}

function firstValidOptionalUrl(candidates: Array<string | null>): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate).toString();
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

export function marketingSiteUrl(): string {
  const vercelUrl = readTrimmedEnv("VERCEL_URL");
  return firstValidUrl([
    readTrimmedEnv("NEXT_PUBLIC_SITE_URL"),
    vercelUrl ? `https://${vercelUrl}` : null,
  ]);
}

export function marketingMetadataBase(): URL {
  return new URL(marketingSiteUrl());
}

export function marketingSiteOrigin(): string {
  return marketingMetadataBase().origin;
}

export function isMarketingAnalyticsEnabled(): boolean {
  const override = readTrimmedEnv("NEXT_PUBLIC_ANALYTICS_ENABLED");
  if (override === "false") return false;
  if (override === "true") return true;
  return process.env.NODE_ENV === "production";
}

/**
 * LINE Tag id for base + conversion snippets. Returns null if explicitly disabled
 * (`NEXT_PUBLIC_LINE_TAG_ID=`) or if the value is not a UUID-shaped id.
 */
export function publicLineTagId(): string | null {
  const raw = process.env.NEXT_PUBLIC_LINE_TAG_ID;
  if (raw !== undefined && raw.trim() === "") return null;
  const fromEnv = readTrimmedEnv("NEXT_PUBLIC_LINE_TAG_ID");
  const candidate = (fromEnv ?? DEFAULT_LINE_TAG_ID).trim();
  return LINE_TAG_UUID.test(candidate) ? candidate : null;
}

/**
 * Load LINE Tag when an id is configured and either marketing analytics is on
 * or `NEXT_PUBLIC_LINE_TAG_ENABLED=true`. Force off with `false`.
 */
export function shouldLoadLineTag(): boolean {
  if (!publicLineTagId()) return false;
  const lineOverride = readTrimmedEnv("NEXT_PUBLIC_LINE_TAG_ENABLED");
  if (lineOverride === "false") return false;
  if (lineOverride === "true") return true;
  return isMarketingAnalyticsEnabled();
}

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * PostHog project key (publishable). No default — PostHog stays off until set.
 * Read via STATIC `process.env.NEXT_PUBLIC_*` so Next inlines it into the client
 * bundle (computed `process.env[name]` is not inlined and would be undefined in
 * the browser; that is why Firebase/LINE rely on hardcoded defaults instead).
 */
export function publicPostHogKey(): string | null {
  const value = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return value ? value : null;
}

/**
 * PostHog ingestion host; defaults to US cloud. Point this at a same-origin
 * reverse proxy (e.g. `https://gogocash.co/ingest`) to dodge ad-blockers —
 * see docs/posthog-reverse-proxy.md.
 */
export function publicPostHogHost(): string {
  const value = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  return value ? value : DEFAULT_POSTHOG_HOST;
}

/** PostHog UI/app host (toolbar, links). Stays the real cloud host when proxying. */
export function publicPostHogUiHost(): string {
  const value = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim();
  return value ? value : "https://us.posthog.com";
}

/**
 * Load PostHog when a key is configured and either marketing analytics is on or
 * `NEXT_PUBLIC_POSTHOG_ENABLED=true`. Force off with `false`. Runtime capture is
 * additionally gated on cookie consent (see `lib/posthog-client.ts`).
 */
export function shouldLoadPostHog(): boolean {
  if (!publicPostHogKey()) return false;
  const override = process.env.NEXT_PUBLIC_POSTHOG_ENABLED?.trim();
  if (override === "false") return false;
  if (override === "true") return true;
  return isMarketingAnalyticsEnabled();
}

export type NewsletterSignupConfig = {
  actionUrl: string | null;
  emailField: string;
  consentField: string;
  sourceField: string;
  sourceValue: string;
  customerIoFormsEnabled: boolean;
};

export type CustomerIoFormsConfig = {
  siteId: string | null;
  baseUrl: string;
  scriptUrl: string;
};

export function customerIoFormsConfig(): CustomerIoFormsConfig {
  const baseUrl = firstValidUrl([
    readTrimmedEnv("NEXT_PUBLIC_CUSTOMERIO_FORMS_BASE_URL"),
    DEFAULT_CUSTOMERIO_FORMS_BASE_URL,
  ]).replace(/\/$/, "");
  const siteId = readPublicIntegrationIdEnv(
    "NEXT_PUBLIC_CUSTOMERIO_FORMS_SITE_ID",
    DEFAULT_CUSTOMERIO_FORMS_SITE_ID,
  );

  return {
    siteId,
    baseUrl,
    scriptUrl: new URL("/assets/forms.js", baseUrl).toString(),
  };
};

/**
 * Public footer newsletter form config. The action URL should be a hosted
 * provider form endpoint (Mailchimp, Brevo, Customer.io, etc.) that accepts
 * browser POSTs; no secret API keys belong in `NEXT_PUBLIC_*` variables.
 */
export function newsletterSignupConfig(): NewsletterSignupConfig {
  const customerIoForms = customerIoFormsConfig();

  return {
    actionUrl: firstValidOptionalUrl([
      readTrimmedEnv("NEXT_PUBLIC_NEWSLETTER_FORM_ACTION"),
    ]),
    emailField: readValidFormFieldEnv(
      "NEXT_PUBLIC_NEWSLETTER_EMAIL_FIELD",
      "email",
    ),
    consentField: readValidFormFieldEnv(
      "NEXT_PUBLIC_NEWSLETTER_CONSENT_FIELD",
      "pdpa_consent",
    ),
    sourceField: readValidFormFieldEnv(
      "NEXT_PUBLIC_NEWSLETTER_SOURCE_FIELD",
      "source",
    ),
    sourceValue:
      readTrimmedEnv("NEXT_PUBLIC_NEWSLETTER_SOURCE_VALUE") ?? "footer",
    customerIoFormsEnabled: Boolean(customerIoForms.siteId),
  };
}

export function publicFirebaseMeasurementId(): string {
  return (
    readTrimmedEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID") ??
    DEFAULT_PUBLIC_FIREBASE_CONFIG.measurementId
  );
}

export function publicFirebaseConfig(): PublicFirebaseConfig | null {
  const apiKey =
    readTrimmedEnv("NEXT_PUBLIC_FIREBASE_API_KEY") ??
    DEFAULT_PUBLIC_FIREBASE_CONFIG.apiKey;
  if (!apiKey) return null;

  return {
    apiKey,
    authDomain:
      readTrimmedEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") ??
      DEFAULT_PUBLIC_FIREBASE_CONFIG.authDomain,
    projectId:
      readTrimmedEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") ??
      DEFAULT_PUBLIC_FIREBASE_CONFIG.projectId,
    storageBucket:
      readTrimmedEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") ??
      DEFAULT_PUBLIC_FIREBASE_CONFIG.storageBucket,
    messagingSenderId:
      readTrimmedEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") ??
      DEFAULT_PUBLIC_FIREBASE_CONFIG.messagingSenderId,
    appId:
      readTrimmedEnv("NEXT_PUBLIC_FIREBASE_APP_ID") ??
      DEFAULT_PUBLIC_FIREBASE_CONFIG.appId,
    measurementId: publicFirebaseMeasurementId(),
  };
}

export function strapiBaseUrl(): string | null {
  const raw = readTrimmedEnv("STRAPI_URL");
  return raw ? raw.replace(/\/$/, "") : null;
}

export function strapiHeaders(): HeadersInit {
  const token = readTrimmedEnv("STRAPI_API_TOKEN");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function involveAsiaConfig(): {
  key: string | null;
  secret: string | null;
  maxOfferPages: number;
} {
  return {
    key: readTrimmedEnv("INVOLVE_ASIA_API_KEY"),
    secret: readTrimmedEnv("INVOLVE_ASIA_API_SECRET"),
    maxOfferPages: Math.min(
      50,
      Math.max(
        1,
        Number(readTrimmedEnv("INVOLVE_ASIA_MAX_OFFER_PAGES") ?? "5") || 5,
      ),
    ),
  };
}
