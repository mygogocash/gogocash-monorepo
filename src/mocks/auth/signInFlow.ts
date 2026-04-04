/**
 * Sign-in flows — reference for QA, onboarding, and test doubles.
 * Implementation: `useFirebaseLogin`, `LoginComponent`, `src/lib/authFirebase.ts`, `src/lib/services/auth.ts`.
 */

export type SignInFlowStep = {
  step: number;
  id: string;
  actor: "user" | "browser" | "app" | "firebase" | "api" | "nextauth";
  description: string;
};

/** Google / X / Facebook: popup → Firebase JWT → NextAuth credentials → backend. */
export const SIGN_IN_FLOW_SOCIAL: SignInFlowStep[] = [
  { step: 1, id: "open-login", actor: "user", description: "Open /login (or /register)." },
  {
    step: 2,
    id: "optional-country",
    actor: "user",
    description: "Select country in Autocomplete (stored for backend payload).",
  },
  {
    step: 3,
    id: "social-click",
    actor: "user",
    description: "Click Google, X, or Facebook tile.",
  },
  {
    step: 4,
    id: "firebase-popup",
    actor: "firebase",
    description: "Firebase Auth popup completes; obtain ID token via getIdToken().",
  },
  {
    step: 5,
    id: "nextauth-signin",
    actor: "nextauth",
    description:
      "Client calls signIn('firebase', { jwt, email, country, pathname, locale, posthog_*, auth_flow, redirect: false }).",
  },
  {
    step: 6,
    id: "backend-auth",
    actor: "api",
    description:
      "Server authorize(): POST /auth/log-in (login path) or /auth/register (when pathname is /register) with Bearer token.",
  },
  {
    step: 7,
    id: "session",
    actor: "nextauth",
    description: "Session populated with user + access_token; client redirects to / on success.",
  },
];

/** Telegram widget path on login page (query/hash) + optional email OTP. */
export const SIGN_IN_FLOW_TELEGRAM: SignInFlowStep[] = [
  {
    step: 1,
    id: "telegram-context",
    actor: "user",
    description: "Land with Telegram auth query or #tgAuthResult.",
  },
  {
    step: 2,
    id: "otp-optional",
    actor: "user",
    description: "If required, verify email via POST /auth/send-otp and /auth/verify-otp.",
  },
  {
    step: 3,
    id: "telegram-api",
    actor: "api",
    description: "POST /auth/log-in/telegram with telegram fields + email + country + referral_id.",
  },
  {
    step: 4,
    id: "nextauth-telegram",
    actor: "nextauth",
    description:
      "signIn('firebase', { jwt: res.token, type: 'telegram', ... , redirect: true }) → GET /user/profile in authorize().",
  },
];

/** Phone CTA currently shows “coming soon” toast — no backend call. */
export const SIGN_IN_FLOW_PHONE: SignInFlowStep[] = [
  {
    step: 1,
    id: "privacy-country-phone",
    actor: "user",
    description: "Accept privacy, pick country, enter local phone.",
  },
  {
    step: 2,
    id: "submit",
    actor: "app",
    description: "Primary button triggers toast (not yet wired to API).",
  },
];

export const SIGN_IN_FLOWS = {
  social: SIGN_IN_FLOW_SOCIAL,
  telegram: SIGN_IN_FLOW_TELEGRAM,
  phone: SIGN_IN_FLOW_PHONE,
} as const;
