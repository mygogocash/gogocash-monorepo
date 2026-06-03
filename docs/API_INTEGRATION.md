# GoGoCash Web — Backend API Integration (Developer Handoff)

**Audience:** External developer wiring the GoGoCash **Next.js customer web app** to the **production backend API**.
**Scope:** This document covers the Next.js app at the **repo root** (`src/`, App Router under `src/app/[locale]/...`). It does **not** cover `apps/mobile/` (the separate Expo app).
**Status:** Generated from the actual source. All file paths are relative to the repo root. Env vars and endpoints use their real names. No secret values are printed.

---

## 0. TL;DR

- **HTTP client:** a single shared Axios instance — [`src/lib/axios/client.ts`](../src/lib/axios/client.ts). It exports a default `client` plus `fetcher` / `fetcherPost` / `fetcherPut` wrappers used by TanStack Query.
- **Base URL:** read from **`NEXT_PUBLIC_API_URL`** via [`getApiBaseUrl()`](../src/lib/env.ts). The production value is **`https://api.gogocash.co`** (confirmed by `next.config.ts` image allow-list and the sibling mobile config).
- **Auth:** Firebase (client) → NextAuth (server credentials provider) → backend session JWT. Every API request carries `Authorization: Bearer <token>`, preferring the auto-refreshing **Firebase ID token**, falling back to the **NextAuth session `access_token`** (the backend-issued JWT).
- **Mocks:** an in-repo mock layer ([`src/mocks/homeApi.ts`](../src/mocks/homeApi.ts)) is wired **inside the Axios adapter**. It activates when `NEXT_PUBLIC_API_URL` is **empty** OR `NEXT_PUBLIC_MOCK_API` is truthy. To use the real API: set `NEXT_PUBLIC_API_URL` and leave `NEXT_PUBLIC_MOCK_API` unset/`0`.
- **~40 distinct backend endpoints** across offers, points/quests, user/profile, wallet/withdraw, affiliate, policy, and auth.
- **Stripe billing is separate:** it does **not** go through `api.gogocash.co`. Checkout/portal/subscription run as Next.js **server actions** talking directly to the Stripe API with `STRIPE_SECRET_KEY` ([`src/features/subscription/actions.ts`](../src/features/subscription/actions.ts)).
- **One config gotcha to confirm:** `apphosting.yaml` sets `NEXT_PUBLIC_API_BASE_URL`, but the code only reads `NEXT_PUBLIC_API_URL`. See [§7 / Ambiguities](#ambiguities-please-confirm).

---

## 1. API Client / Transport

### 1.1 The Axios instance
File: [`src/lib/axios/client.ts`](../src/lib/axios/client.ts)

```ts
const baseURL = getApiBaseUrl();              // from NEXT_PUBLIC_API_URL
const client = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  adapter: mockAwareAdapter,                  // mock switch lives here
});
export default client;
```

- **`baseURL`** comes from [`getApiBaseUrl()`](../src/lib/env.ts), which trims a trailing slash and treats `""`/`"undefined"`/`"null"` as empty.
- All app/service calls use **relative paths** like `/offer/banner-home`, `/user/profile`, `/auth/log-in`. Axios prepends `baseURL`. So with `NEXT_PUBLIC_API_URL=https://api.gogocash.co`, a request to `/user/profile` hits `https://api.gogocash.co/user/profile`.
- There is **no Next.js rewrite/proxy** for the API. `proxy.ts` at the root is **only** the `next-intl` locale middleware — not an API proxy. The browser calls `api.gogocash.co` directly (CORS applies — see §7).

### 1.2 Fetcher wrappers (used by TanStack Query)
Same file, exported:

| Export | Method | Used as |
|---|---|---|
| `fetcher(url \| [url, config])` | GET | `queryFn: () => fetcher("/offer/banner-home")` |
| `fetcherPost(url \| [url, config])` | POST | `queryFn: () => fetcherPost("/withdraw/check")` |
| `fetcherPut(url \| [url, config])` | PUT | `fetcherPut(["/user/profile", { data: {...} }])` |

These return `res.data` directly (unwrapped). They also consult the mock layer (see §5).

### 1.3 Server-side vs client-side fetching
- The Axios client is **primarily browser-side**. Auth token acquisition (Firebase ID token) is gated on `typeof window !== "undefined"` and `getClientAuth()` throws if called on the server.
- Data fetching for home/shop/profile/wallet/quest is done in **client components** (`"use client"`) via TanStack Query (`@tanstack/react-query`). React Query provider: [`src/lib/query/queryClient.ts`](../src/lib/query/queryClient.ts).
- **Server-side calls that exist:**
  - NextAuth credentials `authorize()` runs server-side and calls the backend (`/auth/log-in`, `/auth/register`, `/auth/minipay-siwe`, `/user/profile` for Telegram) — see [`src/lib/authFirebase.ts`](../src/lib/authFirebase.ts). On the server, the token comes from the NextAuth session (no Firebase ID token).
  - Subscription server actions call **Stripe directly**, not the backend.
- Session snapshot for Axios is cached/deduped browser-side (1.5s TTL): [`src/lib/axios/sessionForAxios.ts`](../src/lib/axios/sessionForAxios.ts).

### 1.4 Interceptors, auth headers, credentials
File: [`src/lib/axios/client.ts`](../src/lib/axios/client.ts)

**Request interceptor:**
1. Try `getFirebaseIdToken()` (auto-refreshing). If present → `Authorization: Bearer <firebaseIdToken>`.
2. Else read NextAuth session → if `session.user.access_token` present → `Authorization: Bearer <access_token>` (backend JWT).
3. In the browser, attach PostHog analytics headers from `getPostHogRequestHeaders()` (see [`src/lib/posthog.ts`](../src/lib/posthog.ts)).

**Response interceptor (token refresh + sign-out):**
- On `401`, or when the error body `message` matches `Firebase ID token` / `invalid algorithm` / `jwt expired` / `Invalid token`, it **re-mints a fresh Firebase ID token and retries the request once**.
- If the retry is impossible/fails, it clears the session cache and calls NextAuth `signOut({ redirect: false })`.
- Non-2xx rejects with `error.response`; no response → throws `"No response from server"`.

> **The backend must accept a Firebase ID token as `Authorization: Bearer` for authenticated routes**, and/or the backend-issued JWT returned from `/auth/log-in`. The web app does not send cookies for API auth — there is **no `withCredentials`** set, so auth is header-bearer only (NextAuth's own cookie is for the Next.js session, not the backend API).

---

## 2. Environment Variables

> List is **key names only**. `NEXT_PUBLIC_*` are exposed to the browser bundle — never put secrets there. Source of truth: [`.env.example`](../.env.example) and the Zod schema [`src/env.ts`](../src/env.ts).

### 2.1 Directly required for backend API integration
| Var | Exposure | Purpose |
|---|---|---|
| **`NEXT_PUBLIC_API_URL`** | client | **Backend API base URL.** Empty ⇒ app serves mocks. Prod: `https://api.gogocash.co`. Read in [`src/lib/env.ts`](../src/lib/env.ts). |
| **`NEXT_PUBLIC_MOCK_API`** | client | `1`/`true`/`yes` ⇒ force mock layer even if API URL is set. Leave unset for prod. |
| `NEXT_PUBLIC_MOCK_ACTIVE_USER_ID` | client | Mock-only: pick mock profile `mock-user-001..005`. Ignored against real API. |
| `NEXT_PUBLIC_MOCK_OFFER_CATALOG_SIZE` | client | Mock-only: size of procedural `/offer` catalog. Ignored against real API. |

### 2.2 Auth (Firebase + NextAuth)
| Var | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | client | Firebase web app config ([`src/lib/firebaseClient.ts`](../src/lib/firebaseClient.ts)). All four required for login. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | client | Firebase auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | client | Firebase project id. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | client | Firebase app id. |
| `NEXTAUTH_SECRET` | **server** | NextAuth JWT signing secret. Required in prod (resolved via [`src/lib/nextAuthSecret.ts`](../src/lib/nextAuthSecret.ts)). |
| `NEXTAUTH_URL` | **server** | Canonical app URL for NextAuth callbacks. |
| `NEXT_PUBLIC_TELEGRAM_BOT_ID` | client | Numeric Telegram bot id for OAuth (Telegram login). |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | client | Telegram bot username (login widget). |
| `TELEGRAM_BOT_TOKEN` | **server** | Telegram bot token — webhooks/backend verification only. Never expose. |
| `TELEGRAM_WEBHOOK_SECRET` | **server** | Telegram webhook verification secret. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | **server** | Optional server-side Google OAuth (not used by the Firebase popup flow). |
| `FACEBOOK_APP_SECRET` | **server** | Meta server-side secret (client SDK uses the public App ID below). |
| `NEXT_PUBLIC_FACEBOOK_CLIENT_ID` | client | Meta/Facebook App ID (public). |

### 2.3 Web3 withdraw (on-chain payouts)
`NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC`, `…_POLYGON`, `…_BNB`, `…_CELO`,
`NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_POLYGON`, `…_BNB`, `…_SONIC`, `…_CELO` — all **client**. Used by [`src/hooks/useWithdrawWeb3.ts`](../src/hooks/useWithdrawWeb3.ts) and [`src/hooks/useWithdrawMyCashback.ts`](../src/hooks/useWithdrawMyCashback.ts).

### 2.4 Stripe (billing — independent of the backend API)
| Var | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_BILLING` | client | `1` ⇒ enable checkout UI on membership/pricing. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | Only if Stripe.js/Elements added later. |
| `STRIPE_SECRET_KEY` | **server** | Enables server actions + `/api/stripe/*` routes. |
| `STRIPE_WEBHOOK_SECRET` | **server** | Verifies `POST /api/webhooks/stripe`. |
| `STRIPE_PRICE_THB_MONTHLY` / `STRIPE_PRICE_THB_ANNUAL` | **server** | Preferred THB Price IDs. |
| `STRIPE_PRICE_STARTER_*` / `STRIPE_PRICE_PLUS_*` / `STRIPE_PRICE_PRO_*` | **server** | Legacy/tier Price IDs. |

### 2.5 Analytics / observability / misc
| Var | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FRONTEND_URL` | client | Canonical frontend origin (metadata, Stripe return URLs). |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` / `…_DEBUG` | client | Analytics toggles ([`src/lib/analytics.ts`](../src/lib/analytics.ts)). |
| `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | client | GTM / GA4 / Meta Pixel. |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | client | PostHog ([`src/lib/posthog.ts`](../src/lib/posthog.ts)); distinct-id is forwarded to the API as headers. |
| `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` / `…_SLOT_QUEST` | client | AdSense placements. |
| `NEXT_PUBLIC_SENTRY_DSN` | client | Sentry browser DSN. |
| `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | **server** | Sentry server DSN + source-map upload (build). |
| `BRANDFETCH_API_KEY` | **server** | Brandfetch Brand API key, used by `GET /api/brandfetch` ([`src/app/api/brandfetch/route.ts`](../src/app/api/brandfetch/route.ts)). |
| `NEXT_PUBLIC_BRANDFETCH_HERO` | client | `1`/`true` ⇒ merchant hero prefers Brandfetch assets. |
| `NEXT_PUBLIC_CATEGORY_POLICY_TERMS` | client | Feature flag for category T&C section. |
| `NEXT_PUBLIC_INTERNAL_CONSENT_BANNER_BUTTON` | client | Show floating cookie-consent trigger (staging/QA). |
| `PDPA_STORE_PATH` / `PDPA_CRON_SECRET` | **server** | PDPA JSON store + cron secret (internal `/api/pdpa/*`, not the backend API). |
| `VERCEL_URL` | **server** | Fallback metadata host. |
| `SKIP_ENV_VALIDATION` | build | CI escape hatch — skips Zod env validation. |

**Production boot guard:** [`src/lib/env.ts`](../src/lib/env.ts) throws at server start if `NODE_ENV=production` and `NEXT_PUBLIC_API_URL` is missing (so a misconfigured prod can't silently serve mock data).

---

## 3. Endpoint Inventory (Backend API)

All paths are **relative to `NEXT_PUBLIC_API_URL`** (e.g. `https://api.gogocash.co`). Method shown where visible. "File" is the primary call site.

### 3.1 Offers / shop / discover
| Path | Method | File | Returns / feeds |
|---|---|---|---|
| `/offer/banner-home` | GET | [`src/features/home/component/Banner.tsx`](../src/features/home/component/Banner.tsx) | Home hero banners |
| `/offer?category=&search=&limit=&page=` | GET | Home [`Trending.tsx`](../src/features/home/component/Trending.tsx), [`Special.tsx`](../src/features/home/component/Special.tsx), [`Popular.tsx`](../src/features/home/component/Popular.tsx), [`CategoryHome.tsx`](../src/features/home/component/CategoryHome.tsx); [`discover/.../DiscoverContentArea.tsx`](../src/features/discover/component/DiscoverContentArea.tsx); [`shop/component/List.tsx`](../src/features/shop/component/List.tsx); [`category/component/List.tsx`](../src/features/category/component/List.tsx); [`search/component/SearchShop.tsx`](../src/features/search/component/SearchShop.tsx) | Paginated offer/brand list (filtered by `category`, `search`) |
| `/offer/extra` | GET | [`src/lib/queries/offerExtra.ts`](../src/lib/queries/offerExtra.ts) | "Extra"/top brands |
| `/offer/extra-point` | GET | [`src/features/quest/component/QuestPage.tsx`](../src/features/quest/component/QuestPage.tsx) | Top brands for quest |
| `/offer/get-category/list` | GET | [`shop/component/List.tsx`](../src/features/shop/component/List.tsx), [`category/component/List.tsx`](../src/features/category/component/List.tsx), [`category/component/ListCate.tsx`](../src/features/category/component/ListCate.tsx) | Category directory |
| `/offer/:id` | GET | [`src/features/shop/component/ShopDetail.tsx`](../src/features/shop/component/ShopDetail.tsx) | Single offer/brand detail |
| `/offer/get-coupon-id/:id` | GET | [`ShopDetail.tsx`](../src/features/shop/component/ShopDetail.tsx) | Coupons for a brand |
| `/offer/favorite/:page/:limit` | GET | [`ShopDetail.tsx`](../src/features/shop/component/ShopDetail.tsx), [`profile/component/Favorite.tsx`](../src/features/profile/component/Favorite.tsx), [`QuestPage.tsx`](../src/features/quest/component/QuestPage.tsx) | User's favorited offers (paginated) |
| `/offer/favorite/:offer_id` | POST | [`src/lib/services/offer.ts`](../src/lib/services/offer.ts) | Toggle/add favorite |
| `/offer/my-offers?limit=&page=` | POST | [`src/features/profile/component/MyOffer.tsx`](../src/features/profile/component/MyOffer.tsx) | User's claimed offers |
| `/policy/category/:categoryId` | GET | [`src/features/category/hooks/useCategoryPolicy.ts`](../src/features/category/hooks/useCategoryPolicy.ts) | Admin T&C policy for a category |

### 3.2 Points / quests / referral
| Path | Method | File | Returns / feeds |
|---|---|---|---|
| `/point/get-quest-open` | GET | [`QuestPage.tsx`](../src/features/quest/component/QuestPage.tsx), [`quest/component/GogoquestHistory.tsx`](../src/features/quest/component/GogoquestHistory.tsx) | Open quest window/date |
| `/point/get-quest-social` | GET | [`QuestPage.tsx`](../src/features/quest/component/QuestPage.tsx) | Social quest rewards |
| `/point/check-points/:startDate/:endDate` | GET | [`QuestPage.tsx`](../src/features/quest/component/QuestPage.tsx) | Quest leaderboard/points in range |
| `/point/my-quest-list/:startDate/:endDate` | GET | [`QuestPage.tsx`](../src/features/quest/component/QuestPage.tsx) | User's quest list in range |
| `/point/quest-history-summary` | GET | [`GogoquestHistory.tsx`](../src/features/quest/component/GogoquestHistory.tsx) | Quest history summary |
| `/point/quest-user-period-summary/:user/:start/:end` | GET | mock + [`quest/component/GogoquestPlayerSummaryDialog.tsx`](../src/features/quest/component/GogoquestPlayerSummaryDialog.tsx) | Per-user period summary |
| `/point/referral-list` | GET | [`referral/component/ReferYourFriendsRow.tsx`](../src/features/referral/component/ReferYourFriendsRow.tsx), [`referral/component/ReferralInvitationPanel.tsx`](../src/features/referral/component/ReferralInvitationPanel.tsx) | User's referrals |

### 3.3 User / profile
| Path | Method | File | Returns / feeds |
|---|---|---|---|
| `/user/profile` | GET | [`useUserCountry.ts`](../src/hooks/useUserCountry.ts), [`wallet/component/MyWalletWithdraw.tsx`](../src/features/wallet/component/MyWalletWithdraw.tsx), [`wallet/component/WithdrawMyCashback.tsx`](../src/features/wallet/component/WithdrawMyCashback.tsx), [`auth/component/MiniPayEmailModal.tsx`](../src/features/auth/component/MiniPayEmailModal.tsx); server: [`authFirebase.ts`](../src/lib/authFirebase.ts) (Telegram) | Current user profile |
| `/user/profile` | PUT | [`profile/component/CardProfile.tsx`](../src/features/profile/component/CardProfile.tsx), [`profile/component/ProfileInfo.tsx`](../src/features/profile/component/ProfileInfo.tsx), [`MiniPayEmailModal.tsx`](../src/features/auth/component/MiniPayEmailModal.tsx) | Update profile (e.g. email) |
| `/user/update-country` | PUT | [`src/lib/services/auth.ts`](../src/lib/services/auth.ts) (`updateCountry`) | Update user country |
| `/user/balance/me/mycashback` | GET | [`profile/component/ProfileInfo.tsx`](../src/features/profile/component/ProfileInfo.tsx) | MyCashback balance |

### 3.4 Wallet / withdraw
| Path | Method | File | Returns / feeds |
|---|---|---|---|
| `/withdraw/check` | POST | [`providers/SessionContext.tsx`](../src/providers/SessionContext.tsx), [`transaction/component/WalletTransaction.tsx`](../src/features/transaction/component/WalletTransaction.tsx), [`wallet/component/MyWalletWithdraw.tsx`](../src/features/wallet/component/MyWalletWithdraw.tsx), [`hooks/useWithdrawWeb3.ts`](../src/hooks/useWithdrawWeb3.ts) | Withdraw eligibility/summary (app-wide) |
| `/withdraw/check-my-cashback` | POST | [`profile/component/ProfileInfo.tsx`](../src/features/profile/component/ProfileInfo.tsx), [`wallet/component/WithdrawMyCashback.tsx`](../src/features/wallet/component/WithdrawMyCashback.tsx) | MyCashback withdraw check |
| `/withdraw/list-check` | POST | [`WalletTransaction.tsx`](../src/features/transaction/component/WalletTransaction.tsx) | Withdraw list/summary |
| `/withdraw` | GET | [`WalletTransaction.tsx`](../src/features/transaction/component/WalletTransaction.tsx) (via `withdrawURL`) | Withdraw history (paginated) |
| `/withdraw` | POST | [`useWithdrawWeb3.ts`](../src/hooks/useWithdrawWeb3.ts), [`useWithdrawMyCashback.ts`](../src/hooks/useWithdrawMyCashback.ts) | Submit a withdrawal (returns 201) |
| `/withdraw/signature` | POST | [`useWithdrawWeb3.ts`](../src/hooks/useWithdrawWeb3.ts), [`useWithdrawMyCashback.ts`](../src/hooks/useWithdrawMyCashback.ts) | Server-signed payout signature (on-chain) |
| `/withdraw/methods` | POST | [`src/lib/services/withdraw.ts`](../src/lib/services/withdraw.ts) (`createMethodWithdraw`) | Create withdraw method |
| `/withdraw/methods/:id` | PATCH | [`withdraw.ts`](../src/lib/services/withdraw.ts) (`updateMethodWithdraw`) | Update withdraw method |
| `/withdraw/methods/:id` | GET | [`profile/component/CreateMethodWithdraw.tsx`](../src/features/profile/component/CreateMethodWithdraw.tsx) | Get one withdraw method |
| `/withdraw/methods-list` | GET | [`profile/component/MethodWithdrawList.tsx`](../src/features/profile/component/MethodWithdrawList.tsx), [`MyWalletWithdraw.tsx`](../src/features/wallet/component/MyWalletWithdraw.tsx), [`WithdrawMyCashback.tsx`](../src/features/wallet/component/WithdrawMyCashback.tsx) | List withdraw methods |
| `/withdraw/banks` | GET | [`profile/component/CreateMethodWithdrawForm.tsx`](../src/features/profile/component/CreateMethodWithdrawForm.tsx) | Bank list |
| `/withdraw/request-manual` | POST | [`withdraw.ts`](../src/lib/services/withdraw.ts) (`createManualWithdrawRequest`) | MiniPay manual payout request |
| `/withdraw/bank-transfer` | POST | (mock + bank-transfer flow) | Bank-transfer withdrawal |

### 3.5 Affiliate / conversions
| Path | Method | File | Returns / feeds |
|---|---|---|---|
| `/involve/create-affiliate` | POST | [`src/lib/services/detail.ts`](../src/lib/services/detail.ts) (`generateDeeplink`) | Generate affiliate deeplink for a shop |
| `/involve/conversion-all` | POST | [`transaction/component/WalletTransaction.tsx`](../src/features/transaction/component/WalletTransaction.tsx) | Conversion/commission history |

### 3.6 Auth (backend session exchange)
| Path | Method | File | Returns / feeds |
|---|---|---|---|
| `/auth/log-in` | POST | [`src/lib/services/auth.ts`](../src/lib/services/auth.ts) (`signInFirebase`) via [`authFirebase.ts`](../src/lib/authFirebase.ts) | Exchange Firebase ID token for `{ user, token }` (session JWT) |
| `/auth/register` | POST | [`auth.ts`](../src/lib/services/auth.ts) (`registerFirebase`) via [`authFirebase.ts`](../src/lib/authFirebase.ts) | Register + exchange token |
| `/auth/log-in/telegram` | POST | [`auth/component/LoginComponent.tsx`](../src/features/auth/component/LoginComponent.tsx) | Telegram login → `{ user, token }` |
| `/auth/minipay-siwe` | POST | [`auth.ts`](../src/lib/services/auth.ts) (`signInMiniPaySiwe`) via [`authFirebase.ts`](../src/lib/authFirebase.ts) | MiniPay SIWE verify → session |
| `/auth/siwe-nonce` | GET | [`auth.ts`](../src/lib/services/auth.ts) (`fetchSiweNonce`) | Single-use SIWE nonce |
| `/auth/send-otp` | POST | [`LoginComponent.tsx`](../src/features/auth/component/LoginComponent.tsx) | Send email/phone OTP |
| `/auth/verify-otp` | POST | [`LoginComponent.tsx`](../src/features/auth/component/LoginComponent.tsx) | Verify OTP |
| `/auth/check-account-telegram/:telegramId` | GET | [`LoginComponent.tsx`](../src/features/auth/component/LoginComponent.tsx) | Look up account by Telegram id |

> **Note:** `/auth/firebase` and `/auth/log-in/telegram` also appear as POST handlers in the mock layer. In real auth, the credentials provider in `authFirebase.ts` is what actually hits `/auth/log-in`, `/auth/register`, `/auth/minipay-siwe`.

### 3.7 Internal Next.js API routes (NOT the backend API)
These live under `src/app/api/**` and run on the Next.js server itself. They do **not** use `NEXT_PUBLIC_API_URL`:
- `GET/POST /api/auth/[...nextauth]` — NextAuth ([`route.ts`](../src/app/api/auth/[...nextauth]/route.ts)).
- `GET /api/brandfetch?domain=` — Brandfetch proxy ([`route.ts`](../src/app/api/brandfetch/route.ts)); consumed by [`useMerchantBrandHero.ts`](../src/features/shop/hooks/useMerchantBrandHero.ts).
- `GET /api/countries` — proxies `restcountries.com` ([`route.ts`](../src/app/api/countries/route.ts)).
- `POST /api/stripe/checkout`, `/api/stripe/portal`, `/api/stripe/webhook`, `/api/webhooks/stripe` — Stripe.
- `/api/pdpa/**` — PDPA consent/data-subject endpoints (internal JSON store).

---

## 4. Auth Integration

### 4.1 The chain
```
[Browser] Firebase sign-in (popup: Google / X / Facebook; or phone OTP; or Telegram; or MiniPay SIWE)
   │  Firebase issues an ID token (JWT)
   ▼
[Browser] NextAuth signIn("firebase", { jwt: <firebaseIdToken>, ... })   // src/hooks/useFirebaseLogin.ts, LoginComponent.tsx
   ▼
[Server] NextAuth CredentialsProvider.authorize()                         // src/lib/authFirebase.ts
   │  POST /auth/log-in (or /auth/register, /auth/minipay-siwe) with Bearer <firebaseIdToken>
   │  Backend returns { user, token }   (token = backend session JWT)
   ▼
[Server] NextAuth jwt() + session() callbacks store user + access_token (= backend token) in the NextAuth session
   ▼
[Browser] Axios request interceptor                                       // src/lib/axios/client.ts
   │  Authorization: Bearer <Firebase ID token>   (preferred, auto-refreshing)
   │  └─ fallback: Authorization: Bearer <session.user.access_token>   (backend JWT; used for Telegram / MiniPay / non-Firebase)
   ▼
[Backend] api.gogocash.co validates the Bearer token
```

### 4.2 Where the token comes from / is attached
- **Firebase ID token:** `getClientAuth().currentUser.getIdToken()` — [`src/lib/firebaseClient.ts`](../src/lib/firebaseClient.ts), used by the interceptor in [`client.ts`](../src/lib/axios/client.ts). Firebase auto-refreshes; the response interceptor force-refreshes once on 401.
- **Backend session JWT (`access_token`):** returned by `/auth/log-in` etc., stored by NextAuth ([`authFirebase.ts`](../src/lib/authFirebase.ts) `jwt`/`session` callbacks), read via [`sessionForAxios.ts`](../src/lib/axios/sessionForAxios.ts).
- **Extra auth-time headers** sent to `/auth/log-in` & `/auth/register` ([`auth.ts`](../src/lib/services/auth.ts)): `X-App-Locale`, `X-PostHog-Distinct-Id`, `X-PostHog-Anonymous-Id`, plus `Authorization: Bearer <firebaseIdToken>`.

### 4.3 Login / OTP flows and their API touchpoints
- **Social (Google/X/Facebook):** [`src/hooks/useFirebaseLogin.ts`](../src/hooks/useFirebaseLogin.ts) → Firebase popup → `signIn("firebase")` → backend `/auth/log-in` or `/auth/register`.
- **Email/Phone OTP:** [`LoginComponent.tsx`](../src/features/auth/component/LoginComponent.tsx) → `POST /auth/send-otp` → `POST /auth/verify-otp` → then `handleLoginTelegram()` (`POST /auth/log-in/telegram`) → `signIn("firebase", { type: "telegram" })`. (A `dev_phone` mock path exists for `NODE_ENV=development` only.)
- **Telegram:** Telegram OAuth params → `POST /auth/log-in/telegram` → `signIn("firebase", { type: "telegram" })` which validates via `GET /user/profile` with the returned token.
- **MiniPay (Celo mini-app):** `GET /auth/siwe-nonce` → sign EIP-4361 → `signIn("firebase", { type: "minipay_siwe" })` → backend `/auth/minipay-siwe`.

### 4.4 Sign-out
[`SessionContext.tsx`](../src/providers/SessionContext.tsx) `signOutAuth()`: Firebase `signOut()` → clear Axios session cache → NextAuth `signOut()`.

---

## 5. Mock vs Real API (the switch)

### 5.1 How mocks are wired
- **Not MSW.** Mocks are an **in-process Axios adapter** plus fetcher short-circuits — [`src/mocks/homeApi.ts`](../src/mocks/homeApi.ts).
- The Axios instance uses `adapter: mockAwareAdapter` ([`client.ts`](../src/lib/axios/client.ts)). On each request, if `shouldUseMockApi()` is true, it resolves a synthetic response from `getMockApiResponse(path, method, body)` and `getMockHttpStatus(path, method)` — **no network call**.
- `fetcher` / `fetcherPost` / `fetcherPut` also call `getMockApiResponse(...)` and return mock data directly when mocking (and as a fallback if a real call fails).

### 5.2 The switch logic
File: [`src/lib/env.ts`](../src/lib/env.ts)
```ts
export const shouldUseMockApi = () =>
  !hasApiBaseUrl() || truthyPublicFlag(env.NEXT_PUBLIC_MOCK_API);
```
So mocks are ON when **either**:
1. `NEXT_PUBLIC_API_URL` is empty/unset, **or**
2. `NEXT_PUBLIC_MOCK_API` ∈ {`1`,`true`,`yes`}.

### 5.3 What to change to hit the real production API
1. Set **`NEXT_PUBLIC_API_URL=https://api.gogocash.co`** (or the correct prod origin).
2. Ensure **`NEXT_PUBLIC_MOCK_API`** is unset or `0`/`false` (remove it from `apphosting.yaml`/host env if present).
3. Rebuild — `NEXT_PUBLIC_*` are inlined at **build time**, so a rebuild/redeploy is required after changing them.
4. (Optional) `NEXT_PUBLIC_MOCK_ACTIVE_USER_ID` / `NEXT_PUBLIC_MOCK_OFFER_CATALOG_SIZE` can be removed — they're mock-only.

There is a visible **mock-mode banner** ([`src/components/MockModeBanner.tsx`](../src/components/MockModeBanner.tsx)) to confirm whether the running app is in mock mode.

---

## 6. Data / Feature Areas (grouped)

| Feature area | Endpoints | Key files |
|---|---|---|
| **Home (banners, offers)** | `/offer/banner-home`, `/offer?…`, `/offer/extra` | `src/features/home/component/*`, `src/lib/queries/offerExtra.ts` |
| **Shop / brand directory** | `/offer?…`, `/offer/:id`, `/offer/get-category/list`, `/offer/get-coupon-id/:id`, `/involve/create-affiliate` | `src/features/shop/*`, `src/features/category/*`, `src/lib/services/detail.ts` |
| **Discover / search** | `/offer?…` (paginated) | `src/features/discover/*`, `src/features/search/*` |
| **Profile** | `/user/profile` (GET/PUT), `/user/update-country`, `/user/balance/me/mycashback`, `/offer/favorite/*`, `/offer/my-offers` | `src/features/profile/*`, `src/hooks/useUserCountry.ts`, `src/lib/services/auth.ts`, `src/lib/services/offer.ts` |
| **Wallet / points / withdraw** | `/withdraw/*`, `/involve/conversion-all` | `src/features/wallet/*`, `src/features/transaction/*`, `src/hooks/useWithdraw*.ts`, `src/lib/services/withdraw.ts` |
| **Quests / referral** | `/point/*`, `/offer/extra-point`, `/offer/favorite/*` | `src/features/quest/*`, `src/features/referral/*` |
| **Auth** | `/auth/*`, `/user/profile` (Telegram validate) | `src/lib/authFirebase.ts`, `src/lib/services/auth.ts`, `src/features/auth/*`, `src/hooks/useFirebaseLogin.ts` |
| **Category policy** | `/policy/category/:id` | `src/features/category/hooks/useCategoryPolicy.ts` |
| **Subscription / billing / Stripe** | **Stripe API directly** (server actions) + internal `/api/stripe/*` | `src/features/subscription/actions.ts`, `src/lib/stripe/*`, `src/app/api/stripe/*` |
| **Analytics / PostHog** | n/a (sends headers to backend) | `src/lib/posthog.ts`, `src/lib/analytics.ts`, `src/providers/PostHogProvider.tsx` |
| **Brandfetch (merchant hero)** | internal `/api/brandfetch` → Brandfetch | `src/app/api/brandfetch/route.ts`, `src/features/shop/hooks/useMerchantBrandHero.ts` |
| **Countries** | internal `/api/countries` → restcountries.com | `src/app/api/countries/route.ts` |

---

## 7. Production Integration Checklist

Ordered steps to wire the app to the production API.

### Step 1 — Set environment variables (host / `.env`)
**Backend API (required):**
- [ ] `NEXT_PUBLIC_API_URL = https://api.gogocash.co` (confirm exact origin with backend team)
- [ ] `NEXT_PUBLIC_MOCK_API` — **unset** (or `0`)

**Auth (required for login):**
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `NEXTAUTH_SECRET` (strong random; server-only)
- [ ] `NEXTAUTH_URL = https://<prod-web-origin>`
- [ ] `NEXT_PUBLIC_FRONTEND_URL = https://<prod-web-origin>`
- [ ] Telegram: `NEXT_PUBLIC_TELEGRAM_BOT_ID`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (+ server `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` if used)
- [ ] Meta: `NEXT_PUBLIC_FACEBOOK_CLIENT_ID` (+ server `FACEBOOK_APP_SECRET` if used)

**Stripe (only if billing is live):**
- [ ] `NEXT_PUBLIC_STRIPE_BILLING=1`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the relevant `STRIPE_PRICE_*` IDs

**Analytics / observability (optional but recommended):**
- [ ] PostHog, GA/GTM/Meta Pixel, Sentry (`NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`), `BRANDFETCH_API_KEY`

### Step 2 — Disable mocks
- [ ] Confirm `NEXT_PUBLIC_MOCK_API` is not set anywhere (host env, `.env.local`, `apphosting.yaml`).
- [ ] Confirm `NEXT_PUBLIC_API_URL` is non-empty (the prod boot guard in `src/lib/env.ts` will otherwise crash the server — which is the intended safety net).

### Step 3 — Point base URL at prod + rebuild
- [ ] Because `NEXT_PUBLIC_*` are build-time inlined, **rebuild and redeploy** after setting envs (`npm run build` / host build).

### Step 4 — Firebase console config
- [ ] In Firebase Auth, add the prod web origin to **Authorized domains**.
- [ ] Enable the providers in use (Google, Twitter/X, Facebook, Phone).
- [ ] Backend must trust this Firebase project (verify ID tokens against the same `projectId`).

### Step 5 — CORS / cookies / domains (backend + infra)
- [ ] **CORS:** `api.gogocash.co` must allow the web origin and the `Authorization`, `X-App-Locale`, `X-PostHog-Distinct-Id`, `X-PostHog-Anonymous-Id` headers (browser calls the API cross-origin; there's no same-origin proxy).
- [ ] **Auth is header-bearer, not cookie:** the app does **not** send credentials/cookies to the API (`withCredentials` is not set), so the backend should authenticate from the `Authorization: Bearer` header, not a cookie.
- [ ] **CSP:** already permissive — `connect-src 'self' https: wss:` in `next.config.ts` allows any HTTPS API origin; no change needed for a custom API domain.
- [ ] If you change the API host, add it to the Next.js image `remotePatterns` in `next.config.ts` if it serves images (currently allows `api.gogocash.co` and `storage.googleapis.com`).

### Step 6 — Smoke-test each feature against the real API
- [ ] **Mock banner gone** — `MockModeBanner` no longer shows.
- [ ] **Home** loads real banners/offers — watch `GET /offer/banner-home`, `GET /offer?…` in the Network tab.
- [ ] **Login** — complete a Google (or phone OTP) login; verify `POST /auth/log-in` returns `{ user, token }` and subsequent requests carry `Authorization: Bearer`.
- [ ] **Shop/brand** — open a brand: `GET /offer/:id`, `GET /offer/get-coupon-id/:id`; generate deeplink: `POST /involve/create-affiliate`.
- [ ] **Profile** — `GET /user/profile`, update email (`PUT /user/profile`), `GET /user/balance/me/mycashback`.
- [ ] **Favorites** — `POST /offer/favorite/:offer_id`, `GET /offer/favorite/:page/:limit`.
- [ ] **Wallet/withdraw** — `POST /withdraw/check`, `GET /withdraw/methods-list`, `GET /withdraw/banks`; a test withdrawal hits `POST /withdraw/signature` then `POST /withdraw` (expect 201).
- [ ] **Quests/referral** — `GET /point/get-quest-open`, `GET /point/referral-list`.
- [ ] **401 handling** — let a token expire; confirm the interceptor refreshes once and only signs out when refresh truly fails.
- [ ] **Billing** (if enabled) — checkout redirects to Stripe (separate from the backend API).

---

## <a id="ambiguities-please-confirm"></a>Ambiguities — please confirm

1. **`NEXT_PUBLIC_API_BASE_URL` vs `NEXT_PUBLIC_API_URL` mismatch.** `apphosting.yaml` (Firebase App Hosting) declares `NEXT_PUBLIC_API_BASE_URL`, but **no code reads it** — the app reads only `NEXT_PUBLIC_API_URL` (verified by grep; `NEXT_PUBLIC_API_BASE_URL` is absent from `src/`). On App Hosting the API URL will not be wired unless this var is **renamed to `NEXT_PUBLIC_API_URL`** (or the code is changed). Confirm before deploy.
2. **Production API origin.** `https://api.gogocash.co` is inferred from `next.config.ts` (image host) and the sibling mobile app's `EXPO_PUBLIC_API_URL`. Confirm the exact prod base URL (and whether it includes a path prefix like `/api` or a version segment — the code assumes paths sit at the root, e.g. `/offer/...`).
3. **Token the backend should validate.** The interceptor prefers the **Firebase ID token** and falls back to the **backend `access_token`**. Confirm production `api.gogocash.co` accepts **both** (Firebase ID token for Firebase users; backend JWT for Telegram/MiniPay), matching the dev/staging behavior.
4. **`NEXT_PUBLIC_MOCK_API` in `apphosting.yaml`.** It is declared there; ensure its value is empty/`0` in production so the app doesn't serve mocks.
