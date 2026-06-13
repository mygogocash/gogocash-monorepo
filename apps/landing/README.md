# GoGoCash — Marketing landing (Next.js)

Production marketing site for **GoGoCash**, built as a **static export** from **Next.js 16** and served from **Firebase Hosting** (custom domain: `gogocash.co`). The stack emphasizes fast static delivery, localized landing paths, optional partner data at build time, and pluggable marketing analytics (Firebase Analytics, LINE Tag).

**Canonical source repository:** [github.com/mygogocash/landing-page](https://github.com/mygogocash/landing-page)

This document is the **canonical onboarding guide** for the repo. Topic-specific runbooks live under [`docs/`](./docs/).

---

## Table of contents

1. [Architecture](#architecture)
2. [Repository layout](#repository-layout)
3. [Prerequisites](#prerequisites)
4. [Quick start](#quick-start)
5. [Environment variables](#environment-variables)
6. [npm scripts](#npm-scripts)
7. [Local development](#local-development)
8. [Production build](#production-build)
9. [Firebase Hosting](#firebase-hosting)
10. [Cloudflare DNS (apex → Firebase)](#cloudflare-dns-apex--firebase)
11. [CI/CD (GitHub Actions)](#cicd-github-actions)
12. [Testing](#testing)
13. [Linting & typecheck](#linting--typecheck)
14. [Patches & tooling notes](#patches--tooling-notes)
15. [Further reading](#further-reading)
16. [Troubleshooting](#troubleshooting)
17. [Social preview (Open Graph)](#social-preview-open-graph)

---

## Architecture

| Layer | Choice | Notes |
|--------|--------|--------|
| Framework | Next.js 16 (App Router) | `output: "export"` → static HTML in `out/` |
| Styling | Tailwind CSS 3.4 | `tailwind.config.ts`; [`patches/tailwindcss+3.4.18.patch`](./patches/tailwindcss+3.4.18.patch) via `patch-package` |
| Motion | Framer Motion | Tree-shaken via `experimental.optimizePackageImports` in [`next.config.mjs`](./next.config.mjs) |
| Content | React 18, `react-markdown` | Learn hub and legal pages |
| SEO / link previews | Next.js `metadata` + shared constants | Default title, description, `og:image`, and Twitter cards; see [Social preview](#social-preview-open-graph) |
| Hosting | Firebase Hosting | `public: "out"` in [`firebase.json`](./firebase.json) |
| Server/API in prod | None for this export | Static files only on Firebase Hosting unless you add a separate backend |
| E2E | Playwright | Serves `out/` with `serve` when `CI=true` — see [`playwright.config.ts`](./playwright.config.ts) |

High-level deploy path:

```mermaid
flowchart LR
  subgraph dev["Developer / CI"]
    A["npm ci"] --> B["lint + unit tests"]
    B --> C["next build"]
    C --> D["out/"]
    D --> E["Playwright e2e"]
    E --> F["deploy-firebase-hosting.mjs"]
  end
  subgraph cloud["Google Cloud"]
    F --> G["Firebase Hosting"]
  end
  subgraph users["Visitors"]
    G --> H["gogocash.co"]
  end
```

**Important:** This app is **not** Firebase App Hosting and **not** a Node server in production. There is no `next start` on Firebase; the live site is **static files** only.

---

## Repository layout

| Path | Purpose |
|------|---------|
| [`app/`](./app/) | App Router routes: home, locale roots (`/en`, `/th`, `/id`, `/ja`, `/tw`), learn hub, search, legal, about, etc. |
| [`components/`](./components/) | Shared UI: header, footer, landing sections, analytics wrappers, locale menu, legal shell |
| [`lib/`](./lib/) | Config (`app-config.ts`), SEO helpers ([`social-preview.ts`](./lib/social-preview.ts) for OG/Twitter defaults), analytics helpers, routing utilities, tests colocated as `*.test.ts` |
| [`public/`](./public/) | Static assets (images, icons) copied into `out/` |
| [`e2e/`](./e2e/) | Playwright specs |
| [`scripts/`](./scripts/) | Deploy helper, Cloudflare DNS, dev helpers, optional Strapi push |
| [`docs/`](./docs/) | Deploy, migration from Framer, learn content, etc. |
| [`.github/workflows/`](./.github/workflows/) | `build-landing.yml` — build, test, e2e, artifact, Firebase deploy |

---

## Prerequisites

- **Node.js 20.x** (use [`.nvmrc`](./.nvmrc) / `fnm` / `nvm`; `package.json` `engines` is `>=20 <21` so CI and local tooling stay aligned with Firebase-related deps.)
- **npm** (lockfile is `package-lock.json`; use `npm ci` in CI and for reproducible installs).
- For **local Firebase deploy**: Firebase CLI is available as a **devDependency** — prefer `npm exec -- firebase` from the repo root.
- For **Cloudflare DNS scripts**: `curl`, `jq`, and a Cloudflare API token (see [Cloudflare DNS](#cloudflare-dns-apex--firebase)).
- For **Playwright locally**: after `npm ci`, run `npm run test:e2e:install` once to download browsers. On **Linux**, WebKit also needs system libraries—use `npx playwright install --with-deps chromium webkit` if launches fail with missing `.so` files.

---

## Quick start

```bash
git clone https://github.com/mygogocash/landing-page.git
cd landing-page
npm ci          # runs patch-package via postinstall
cp .env.example .env.local   # optional; see Environment variables
npm run dev
```

Open `http://127.0.0.1:3000` (dev server binds `0.0.0.0:3000`).

---

## Environment variables

Variables are documented inline in **[`.env.example`](./.env.example)**. Below is a consolidated reference.

### Build-time / runtime (Next.js)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Recommended for prod builds | Canonical public URL (metadata, OG, sitemap). Falls back to `VERCEL_URL` or defaults in code. |
| `INVOLVE_ASIA_API_KEY` / `INVOLVE_ASIA_API_SECRET` | Optional | If set, build can pull live partner/offer data; otherwise bundled/static behavior is used. |
| `INVOLVE_ASIA_MAX_OFFER_PAGES` | Optional | Caps Involve Asia pagination during build. |
| `NEXT_PUBLIC_FIREBASE_*` | Optional | Override public Firebase web config (defaults live in [`lib/app-config.ts`](./lib/app-config.ts)). |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Optional | `true` / `false` — gates marketing analytics defaults. |
| `NEXT_PUBLIC_LINE_TAG_ID` | Optional | Empty string disables LINE Tag; must look like a UUID when set. |
| `NEXT_PUBLIC_LINE_TAG_ENABLED` | Optional | Force LINE Tag on/off when an id exists. |
| `NEXT_PUBLIC_CUSTOMERIO_FORMS_SITE_ID` / `NEXT_PUBLIC_CUSTOMERIO_FORMS_BASE_URL` | Optional | Customer.io Connected Forms config for the footer newsletter form. Defaults to the GoGoCash Customer.io Forms snippet; empty site id disables it. |
| `NEXT_PUBLIC_NEWSLETTER_FORM_ACTION` | Optional | Hosted footer newsletter form endpoint from Mailchimp, Brevo, Customer.io, etc. Visitors can enter an email and click Subscribe after consent; provider-backed submission shows a setup notice until this is configured. |
| `NEXT_PUBLIC_NEWSLETTER_EMAIL_FIELD` / `NEXT_PUBLIC_NEWSLETTER_CONSENT_FIELD` | Optional | Provider-specific field names for the footer newsletter email and PDPA consent checkbox. Defaults to `email` and `pdpa_consent`. |
| `NEXT_PUBLIC_NEWSLETTER_SOURCE_FIELD` / `NEXT_PUBLIC_NEWSLETTER_SOURCE_VALUE` | Optional | Provider-specific source tracking field/value for the footer newsletter form. Defaults to `source=footer`. |
| `STRAPI_URL` | Optional | If set at build time, Learn hub/articles may load from Strapi; otherwise local Markdown. See [`docs/learn-content.md`](./docs/learn-content.md). |
| `STRAPI_API_TOKEN` | Optional | Strapi API token for protected content types (build-time only). |

**Critical:** `NEXT_PUBLIC_*` values are **inlined at `next build`**. Changing them requires a **rebuild** and **redeploy**. For GitHub Actions, set repository secrets and pass them into the build step as in [`.github/workflows/build-landing.yml`](./.github/workflows/build-landing.yml).

### Local-only files (never commit secrets)

| File | Purpose |
|------|---------|
| `.env.local` | Local Next.js overrides (gitignored by default pattern). |
| `.env.production.local` | Production-like local builds without committing keys. |
| `.env.cloudflare` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` for DNS automation (gitignored). Template: [`.env.cloudflare.example`](./.env.cloudflare.example). |

---

## npm scripts

| Script | What it does |
|--------|----------------|
| `npm run dev` | Next dev server (Turbopack), port 3000. |
| `npm run build` | Static export → `out/`. |
| `npm run build:webpack` | Same as `build` but **Webpack** (used by `analyze`; default build uses Turbopack). |
| `npm run analyze` | Webpack build with `@next/bundle-analyzer` (`ANALYZE=true`); writes HTML under `.next/analyze/` (e.g. `client.html`; `.next/` is gitignored). |
| `npm run analyze:turbopack` | `next experimental-analyze` — interactive Turbopack bundle UI (no `out/` artifact). |
| `npm run start` | `next start` — **not** used for Firebase production (static hosting only). |
| `npm run lint` | ESLint (flat config in [`eslint.config.mjs`](./eslint.config.mjs)). |
| `npm run test` | Node test runner via `tsx` on `lib/**/*.test.ts`. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run verify` | `lint` + `test` + `typecheck` + `build`. |
| `npm run test:e2e` | Playwright (local: tries dev server with reuse). |
| `npm run test:e2e:ci` | Playwright with `CI=true` behavior from config (serves `out/`). |
| `npm run test:e2e:install` | Install Chromium + WebKit for Playwright. |
| `npm run deploy:firebase` | `build` + [`scripts/deploy-firebase-hosting.mjs`](./scripts/deploy-firebase-hosting.mjs) (hosting only). |
| `npm run deploy:firebase:full` | Alias for `deploy:firebase` (hosting only). |
| `npm run dns:cloudflare-firebase-apex` | Load `.env.cloudflare` and run Cloudflare apex DNS helper. |
| `npm run learn:strapi-push` | Push local learn Markdown to Strapi (see [`docs/learn-content.md`](./docs/learn-content.md)). |
| `npm run lh:mobile` | Lighthouse mobile preset against `http://127.0.0.1:3000/` (requires dev server + `npx` download). |

---

## Local development

- **Standard:** `npm run dev`.
- **Alternative:** `npm run dev:local` runs [`scripts/dev-local.sh`](./scripts/dev-local.sh) if you keep machine-specific steps there.
- **Webpack dev:** `npm run dev:webpack` if you need to compare Turbopack vs Webpack behavior.

Hot reload and HMR work against the dev server; **always validate production output** with `npm run build` because the live site is static export, not SSR.

---

## Production build

```bash
npm run build
```

Artifacts land in **`out/`**. [`next.config.mjs`](./next.config.mjs) sets `output: "export"` and `images.unoptimized: true` (required for static export with remote images as configured).

**Bundle size:** run `npm run analyze` (Webpack report under `.next/analyze/`) or `npm run analyze:turbopack` for the Turbopack UI. Production CI uses the default Turbopack build, not the Webpack analyzer path.

Preview static output locally (similar to CI):

```bash
npx --yes serve@14 out -l 3000
```

---

## Firebase Hosting

| Item | Value |
|------|--------|
| Default GCP / Firebase project | `landing-page-4ae23` ([`.firebaserc`](./.firebaserc)) |
| Hosting site id | `landing-page-4ae23` ([`firebase.json`](./firebase.json)) |
| Deployed static root | `out/` |

**Deploy hosting only (after build):**

```bash
npm run deploy:firebase
```

Full operational detail and “do not run `firebase init` for App Hosting” notes: **[`docs/firebase-deploy.md`](./docs/firebase-deploy.md)**.

---

## Cloudflare DNS (apex → Firebase)

Firebase **Quick setup** for a custom apex domain expects an **`A` record** for the apex pointing to **`199.36.158.100`**, and (for verification / SSL) traffic must reach **Firebase**, not Cloudflare’s reverse proxy.

**Common mistake:** Creating the correct `A` record but leaving **Proxied** (orange cloud) **on**. Public DNS then returns **Cloudflare anycast IPs**, Firebase’s ACME HTTP checks fail (e.g. **526**), and the console still asks to remove old `A`/`AAAA` answers.

This repo includes:

- [`scripts/cloudflare-firebase-dns-setup.sh`](./scripts/cloudflare-firebase-dns-setup.sh) — removes legacy Framer-style apex `A`/`AAAA` targets when present, ensures Firebase apex `A`, and **turns off proxy** if the Firebase `A` exists but is still proxied.
- [`scripts/run-cloudflare-firebase-dns.sh`](./scripts/run-cloudflare-firebase-dns.sh) — sources **`.env.cloudflare`** then runs the setup script.

```bash
cp .env.cloudflare.example .env.cloudflare
# edit .env.cloudflare — use a token with Zone → DNS → Edit for the zone only

npm run dns:cloudflare-firebase-apex
# optional: DRY_RUN=1 npm run dns:cloudflare-firebase-apex
```

---

## CI/CD (GitHub Actions)

Workflow: **[`.github/workflows/build-landing.yml`](./.github/workflows/build-landing.yml)** (`Build and deploy landing`).

| Step | Action |
|------|--------|
| Trigger | Push to `main`, or `workflow_dispatch` |
| Install | `npm ci` |
| Quality | `npm run lint`, `npm run test` |
| Build | `npm run build` (optional `INVOLVE_ASIA_*` from secrets) |
| E2E | `npx playwright install --with-deps chromium webkit` then `npm run test:e2e:ci` (Ubuntu runners need `--with-deps` for WebKit) |
| Artifact | Uploads `out/` as `landing-page-out` (1-day retention) |
| Deploy | OIDC → Google Cloud WIF, then `node scripts/deploy-firebase-hosting.mjs` |

**GitHub repository secrets (optional but recommended for partner data):**

- `INVOLVE_ASIA_API_KEY`
- `INVOLVE_ASIA_API_SECRET`

**Google Cloud:** The workflow uses **Workload Identity Federation** (no long-lived JSON key in the repo). Pool / provider / service account IDs are pinned in the YAML; changing projects requires updating those values and IAM bindings in GCP.

---

## Testing

| Layer | Command | Scope |
|--------|---------|--------|
| Unit / integration (light) | `npm run test` | `lib/**/*.test.ts` (e.g. `app-config`, routing helpers, Strapi/Involve fallbacks) |
| E2E | `npm run test:e2e` or `npm run test:e2e:ci` | Smoke, navigation, sitemap, mobile overflow, landmarks — see [`e2e/`](./e2e/) |
| Full gate | `npm run verify` | Lint + unit + typecheck + build |

Playwright projects: **mobile-chrome** (Pixel 5) and **mobile-safari** (iPhone 12), see [`playwright.config.ts`](./playwright.config.ts).

---

## Linting & typecheck

- **ESLint 9** with [`eslint.config.mjs`](./eslint.config.mjs) extending `eslint-config-next` (Core Web Vitals + TypeScript).
- **Ignored paths** in config: `e2e/`, `out/`, etc. Do not remove `node_modules` / `.next` ignore flags from the `lint` script without cause.
- Avoid forcing incompatible **npm overrides** on transitive deps used by ESLint (historically `brace-expansion@5` broke `minimatch` inside `@eslint/config-array`).

---

## Patches & tooling notes

- **`patch-package`**: Applied on `npm install` via `postinstall`. Currently patches **Tailwind** 3.4.18 ([`patches/tailwindcss+3.4.18.patch`](./patches/tailwindcss+3.4.18.patch)). If you upgrade Tailwind, regenerate or remove the patch as needed.
- **Firebase CLI**: Use the **project-local** version (`npm exec -- firebase`) to avoid global/CLI version skew.

---

## Further reading

| Document | Topic |
|----------|--------|
| [`docs/firebase-deploy.md`](./docs/firebase-deploy.md) | End-to-end Firebase Hosting deploy |
| [`docs/framer-to-next-migration.md`](./docs/framer-to-next-migration.md) | Migration notes from Framer |
| [`docs/learn-content.md`](./docs/learn-content.md) | Learn articles: local files vs Strapi, CI, `learn:strapi-push` |

---

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| Firebase domain verification / SSL **526** or “remove AAAA” | Apex `A` must be **DNS only** (grey cloud) to `199.36.158.100`. Re-run `npm run dns:cloudflare-firebase-apex` after fixing `.env.cloudflare`. |
| `npm run lint` crashes with `expand is not a function` | Broken `minimatch` / `brace-expansion` mix — remove incompatible `overrides` in `package.json` and run `npm install`. |
| Build works locally, CI fails | Compare Node version (CI uses 20), ensure `npm ci` lockfile is committed, check GitHub Actions logs for the failing step. |
| Firebase deploy auth errors in CI | WIF provider, service account permissions, and `google-github-actions/auth` settings must match the Firebase/GCP project. |
| Empty partner data in build | Set `INVOLVE_ASIA_*` for build, or accept static fallback documented in `.env.example`. |
| E2E WebKit: “Host system is missing dependencies” (CI/Linux) | Run `npx playwright install --with-deps chromium webkit` (see workflow); `playwright install` alone is not enough for WebKit on Ubuntu. |

---

## Social preview (Open Graph)

Default **link preview** copy (title, description, image) for the marketing site is centralized in **[`lib/social-preview.ts`](./lib/social-preview.ts)** and consumed from [`app/layout.tsx`](./app/layout.tsx) (root metadata), [`app/en/page.tsx`](./app/en/page.tsx), and as the fallback image for learn articles in [`app/learn/[slug]/page.tsx`](./app/learn/[slug]/page.tsx).

| Item | Location |
|------|----------|
| OG / Twitter image | [`public/images/gogocash-social-preview.jpg`](./public/images/gogocash-social-preview.jpg) (referenced by `OG_IMAGE_*` in `social-preview.ts`) |
| Title & description strings | Exported as `SOCIAL_PREVIEW_TITLE` and `SOCIAL_PREVIEW_DESCRIPTION` |

[`scripts/generate-seo-assets.mjs`](./scripts/generate-seo-assets.mjs) generates logo and LINE QR assets only; it does **not** overwrite the hand-maintained social preview image.

After changing copy or the image, rebuild and redeploy. Social platforms cache previews—use each platform’s debugger (e.g. Facebook Sharing Debugger) to refresh cached `og:image` when needed.

---

## License

Proprietary — **GoGoCash**. Do not deploy to unauthorized Firebase projects or domains without explicit approval.
