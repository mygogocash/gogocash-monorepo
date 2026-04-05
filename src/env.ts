import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const optionalString = z.string().optional();

export const env = createEnv({
  server: {
    NEXTAUTH_SECRET: z.string().min(1).optional(),
    NEXTAUTH_URL: optionalString,
    /**
     * Google OAuth (server-only). Use if you add a server-side Google flow (e.g. NextAuth provider).
     * Never prefix with NEXT_PUBLIC_.
     */
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    /**
     * Meta / Facebook App Secret — server-only. Never use NEXT_PUBLIC_* (browser bundle).
     * Client SDK / widgets only need NEXT_PUBLIC_FACEBOOK_CLIENT_ID (App ID).
     */
    FACEBOOK_APP_SECRET: optionalString,
    /**
     * Telegram bot token (`123456789:AAH...`) — server-only for webhooks / backend verification.
     * For Telegram Login OAuth redirects, expose only the numeric bot id via NEXT_PUBLIC_TELEGRAM_BOT_ID.
     */
    TELEGRAM_BOT_TOKEN: optionalString,
    /** Optional secret for verifying Telegram webhook requests (server-only). */
    TELEGRAM_WEBHOOK_SECRET: optionalString,
    /** Server/edge DSN (preferred). Falls back to NEXT_PUBLIC_SENTRY_DSN in Sentry configs when unset. */
    SENTRY_DSN: optionalString,
    /** Build-time only: source map upload (see Sentry Next.js docs). */
    SENTRY_AUTH_TOKEN: optionalString,
    SENTRY_ORG: optionalString,
    SENTRY_PROJECT: optionalString,
    /** Brandfetch Brand API (server-only). Used by `/api/brandfetch` for merchant hero assets. */
    BRANDFETCH_API_KEY: optionalString,
    /** Vercel deployment host (no protocol). Used for `metadataBase` when `NEXT_PUBLIC_FRONTEND_URL` is unset. */
    VERCEL_URL: optionalString,
    /** Optional **absolute** path to PDPA JSON store (default: `<cwd>/data/pdpa/store.json`). */
    PDPA_STORE_PATH: optionalString,
    /** Secret for `POST /api/pdpa/jobs/retention` and other cron-style PDPA endpoints. */
    PDPA_CRON_SECRET: optionalString,
    /** Stripe secret key (`sk_...`) — server-only. Enables `/api/stripe/*` routes. */
    STRIPE_SECRET_KEY: optionalString,
    /** Webhook signing secret (`whsec_...`) for `POST /api/stripe/webhook`. */
    STRIPE_WEBHOOK_SECRET: optionalString,
    /** Subscription Price IDs from Stripe Dashboard (Billing → Products). */
    STRIPE_PRICE_STARTER_MONTHLY: optionalString,
    /** Annual Starter — alias for `STRIPE_PRICE_STARTER_YEARLY` if unset. */
    STRIPE_PRICE_STARTER_ANNUAL: optionalString,
    STRIPE_PRICE_STARTER_YEARLY: optionalString,
    STRIPE_PRICE_PLUS_MONTHLY: optionalString,
    STRIPE_PRICE_PLUS_YEARLY: optionalString,
    STRIPE_PRICE_PRO_MONTHLY: optionalString,
    STRIPE_PRICE_PRO_YEARLY: optionalString,
    /** GoGo Unlimited — 49 THB / month (preferred when set; overrides tier starter/plus monthly). */
    STRIPE_PRICE_THB_MONTHLY: optionalString,
    /** GoGo Unlimited — 490 THB / year (preferred when set; overrides tier starter/plus annual). */
    STRIPE_PRICE_THB_ANNUAL: optionalString,
  },
  client: {
    NEXT_PUBLIC_API_URL: optionalString,
    /**
     * When `1` or `true`, all Axios/API traffic uses in-repo mock handlers (`src/mocks/homeApi.ts`)
     * even if `NEXT_PUBLIC_API_URL` is set. For internal demos and App Hosting without a real API.
     */
    NEXT_PUBLIC_MOCK_API: optionalString,
    /** When using mock API, optional profile id: mock-user-001 … mock-user-005 (see `src/mocks/homeApi.ts`). */
    NEXT_PUBLIC_MOCK_ACTIVE_USER_ID: optionalString,
    /**
     * Crossmint client API key used by `@crossmint/client-sdk-react-ui` in the browser.
     * Use a Crossmint **client / publishable** key scoped for frontend use; never put server admin keys here.
     */
    NEXT_PUBLIC_CROSSMINT_API_KEY: optionalString,
    NEXT_PUBLIC_CROSSMINT_COLLECTION_ID: optionalString,
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: optionalString,
    NEXT_PUBLIC_FRONTEND_URL: optionalString,
    NEXT_PUBLIC_ANALYTICS_ENABLED: optionalString,
    NEXT_PUBLIC_ANALYTICS_DEBUG: optionalString,
    NEXT_PUBLIC_GTM_ID: optionalString,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalString,
    NEXT_PUBLIC_META_PIXEL_ID: optionalString,
    /** Facebook / Meta App ID — safe to expose (used by SDK / xfbml). */
    NEXT_PUBLIC_FACEBOOK_CLIENT_ID: optionalString,
    /**
     * Telegram bot numeric id for `oauth.telegram.org` (same number as before `:` in the bot token).
     * Prefer this over NEXT_PUBLIC_TELEGRAM_BOT_TOKEN so the full token is not shipped to the browser.
     */
    NEXT_PUBLIC_TELEGRAM_BOT_ID: optionalString,
    /**
     * @deprecated Prefer NEXT_PUBLIC_TELEGRAM_BOT_ID. If set, only the `123456789` prefix is used for OAuth URLs.
     * Avoid deploying the full token to the client in new setups.
     */
    NEXT_PUBLIC_TELEGRAM_BOT_TOKEN: optionalString,
    NEXT_PUBLIC_POSTHOG_KEY: optionalString,
    NEXT_PUBLIC_POSTHOG_HOST: optionalString,
    NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC: optionalString,
    NEXT_PUBLIC_CHAIN_ID_WITHDRAW_POLYGON: optionalString,
    NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB: optionalString,
    NEXT_PUBLIC_CHAIN_ID_WITHDRAW_CELO: optionalString,
    NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_POLYGON: optionalString,
    NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_BNB: optionalString,
    NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_SONIC: optionalString,
    NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_CELO: optionalString,
    NEXT_PUBLIC_FIREBASE_API_KEY: optionalString,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optionalString,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: optionalString,
    NEXT_PUBLIC_FIREBASE_APP_ID: optionalString,
    NEXT_PUBLIC_SENTRY_DSN: optionalString,
    /** When `1` or `true`, merchant hero prefers Brandfetch banner/logo when URLs exist. */
    NEXT_PUBLIC_BRANDFETCH_HERO: optionalString,
    /**
     * When `1` or `true`, show a floating cookie-consent trigger (staging / QA). Shown automatically in `next dev`.
     */
    NEXT_PUBLIC_INTERNAL_CONSENT_BANNER_BUTTON: optionalString,
    /**
     * When `1`, show Stripe checkout actions on membership (requires `STRIPE_SECRET_KEY` + Price IDs server-side).
     */
    NEXT_PUBLIC_STRIPE_BILLING: optionalString,
    /** Stripe publishable key (`pk_...`) — only if you add Stripe.js / Elements later; keep optional. */
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_MOCK_API: process.env.NEXT_PUBLIC_MOCK_API,
    NEXT_PUBLIC_MOCK_ACTIVE_USER_ID: process.env.NEXT_PUBLIC_MOCK_ACTIVE_USER_ID,
    NEXT_PUBLIC_CROSSMINT_API_KEY: process.env.NEXT_PUBLIC_CROSSMINT_API_KEY,
    NEXT_PUBLIC_CROSSMINT_COLLECTION_ID: process.env.NEXT_PUBLIC_CROSSMINT_COLLECTION_ID,
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
    NEXT_PUBLIC_ANALYTICS_DEBUG: process.env.NEXT_PUBLIC_ANALYTICS_DEBUG,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    NEXT_PUBLIC_FACEBOOK_CLIENT_ID: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
    NEXT_PUBLIC_TELEGRAM_BOT_ID: process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID,
    NEXT_PUBLIC_TELEGRAM_BOT_TOKEN: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC: process.env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC,
    NEXT_PUBLIC_CHAIN_ID_WITHDRAW_POLYGON: process.env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_POLYGON,
    NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB: process.env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB,
    NEXT_PUBLIC_CHAIN_ID_WITHDRAW_CELO: process.env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_CELO,
    NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_POLYGON:
      process.env.NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_POLYGON,
    NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_BNB:
      process.env.NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_BNB,
    NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_SONIC:
      process.env.NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_SONIC,
    NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_CELO:
      process.env.NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_CELO,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_BRANDFETCH_HERO: process.env.NEXT_PUBLIC_BRANDFETCH_HERO,
    NEXT_PUBLIC_INTERNAL_CONSENT_BANNER_BUTTON:
      process.env.NEXT_PUBLIC_INTERNAL_CONSENT_BANNER_BUTTON,
    NEXT_PUBLIC_STRIPE_BILLING: process.env.NEXT_PUBLIC_STRIPE_BILLING,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
