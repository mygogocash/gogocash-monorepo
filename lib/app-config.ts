const DEFAULT_SITE_URL = "https://gogocash.co";

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

/** PostHog ingestion host; defaults to US cloud. */
export function publicPostHogHost(): string {
  const value = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  return value ? value : DEFAULT_POSTHOG_HOST;
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
