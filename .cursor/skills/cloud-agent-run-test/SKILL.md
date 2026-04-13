---
name: cloud-agent-run-test
description: Run, test, and mock env for the GoGoCash Next.js static landing (dev, build, Playwright, Firebase, Cloudflare). Use when setting up CI-like verification, E2E, or deploy-related tasks.
---

# Cloud agent — run and test this repo

Minimal runbook for **autonomous agents** working on **gogocash-landing** (Next.js 16, static export → `out/`, Firebase Hosting). Canonical detail lives in [`README.md`](../../../README.md) and [`docs/`](../../../docs/).

## Prerequisites (once per machine / CI job)

- **Node 20.x** — match [`.nvmrc`](../../../.nvmrc); `package.json` engines are `>=20 <21`.
- From repo root:

```bash
npm ci
```

(`postinstall` runs `patch-package`.)

- **Playwright browsers** (before any E2E):

```bash
npm run test:e2e:install
```

On **Linux CI or bare agents**, WebKit needs system libs — mirror CI:

```bash
npx playwright install --with-deps chromium webkit
```

## Start the app

| Goal | Command | URL |
|------|---------|-----|
| Hot-reload dev | `npm run dev` | `http://127.0.0.1:3000` (server binds `0.0.0.0:3000`) |
| Optional local wrapper | `npm run dev:local` | same |
| Webpack dev (compare behavior) | `npm run dev:webpack` | same |
| Static preview (like prod) | `npm run build` then `npx --yes serve@14 out -l 3000` | `http://127.0.0.1:3000` |

**Production truth:** the live site is **static files** in `out/`, not `next start`. Always validate with `npm run build` when changing routing, metadata, or export behavior.

## Environment and “feature flags”

There is **no** separate feature-flag service. Behavior toggles are **env vars** (especially `NEXT_PUBLIC_*`), read at **build time** for public flags.

- **Template:** copy [`.env.example`](../../../.env.example) → **`.env.local`** for local Next (gitignored). Never commit secrets.
- **Analytics on/off:** `NEXT_PUBLIC_ANALYTICS_ENABLED=true|false` — see `isMarketingAnalyticsEnabled()` in [`lib/app-config.ts`](../../../lib/app-config.ts).
- **LINE Tag:** `NEXT_PUBLIC_LINE_TAG_ID` (empty string disables), `NEXT_PUBLIC_LINE_TAG_ENABLED=true|false` — see `shouldLoadLineTag()` in the same file.
- **Firebase web config / measurement:** `NEXT_PUBLIC_FIREBASE_*` — overrides defaults in `app-config.ts` if set.
- **Canonical URL / OG:** `NEXT_PUBLIC_SITE_URL` (recommended for prod-like builds).
- **Partner data at build:** `INVOLVE_ASIA_API_KEY`, `INVOLVE_ASIA_API_SECRET`, optional `INVOLVE_ASIA_MAX_OFFER_PAGES` — omit to use bundled/static behavior.
- **Learn hub from Strapi:** `STRAPI_URL`, `STRAPI_API_TOKEN` — omit for local Markdown — see [`docs/learn-content.md`](../../../docs/learn-content.md).
- **Learn debug logging:** `NODE_DEBUG=learn-data` (see `.env.example`).

Changing **`NEXT_PUBLIC_*`** requires **`npm run build`** again to affect the static export.

### Cloudflare DNS automation (not Next)

- Copy [`.env.cloudflare.example`](../../../.env.cloudflare.example) → `.env.cloudflare` (gitignored).
- `npm run dns:cloudflare-firebase-apex` — optional `DRY_RUN=1` prefix for a dry run.

### Firebase CLI (human / local deploy)

Use **project-local** CLI: `npm exec -- firebase …`. Login and project: see [`docs/firebase-deploy.md`](../../../docs/firebase-deploy.md) (`firebase login`, `firebase use landing-page-4ae23`). **Do not** run `firebase init` for App Hosting on this repo.

---

## By codebase area

### Root / toolchain

- **Install:** `npm ci`
- **Full gate (lint + unit + types + build):** `npm run verify`
- **Lint:** `npm run lint`
- **Typecheck:** `npm run typecheck`

### `lib/` — unit tests and config

- **Run:** `npm run test` — discovers `lib/**/*.test.ts` via [`scripts/run-lib-tests.mjs`](../../../scripts/run-lib-tests.mjs).
- **When editing:** `app-config`, routing, Strapi/Involve helpers, SEO utilities — add or extend `*.test.ts` next to the module.

### `app/` + `components/` — UI and routes

- **Manual:** `npm run dev`, exercise paths under `app/` (locales, learn, legal, about).
- **Static correctness:** `npm run build` (failures often show missing `generateStaticParams`, image export issues, etc.).
- **E2E:** see below — specs live in [`e2e/`](../../../e2e/).

### `e2e/` — Playwright

Config: [`playwright.config.ts`](../../../playwright.config.ts).

- **CI-style (serves `out/` — requires build first):**

```bash
npm run build
CI=true npm run test:e2e:ci
```

- **Static export only (no implicit CI):**

```bash
npm run test:e2e:static
```

- **Local (reuses dev server on port 3000 if already up):**

```bash
npm run test:e2e
```

- **Smoke subset:**

```bash
npm run test:e2e:smoke
```

**Useful env:** `PLAYWRIGHT_BASE_URL`, `PORT`, `PLAYWRIGHT_HOST`, `PLAYWRIGHT_SERVE_STATIC=1` (serve `out/` without `CI=true`), `PLAYWRIGHT_SERVE_STATIC=1` is already wrapped in `test:e2e:static-only`.

### `scripts/` — deploy and ops

- **Firebase hosting deploy (build + script):** `npm run deploy:firebase` — details [`docs/firebase-deploy.md`](../../../docs/firebase-deploy.md).
- **Cloudflare apex DNS:** `npm run dns:cloudflare-firebase-apex` (needs `.env.cloudflare`).

### `docs/` — deep dives

Use for Strapi push, migration notes, deploy edge cases — start from [`README.md`](../../../README.md) “Further reading”.

---

## Updating this skill

When you discover a new command, env var, CI quirk, or test trick:

1. Add or adjust the relevant **section** above (keep it **short**; link to `README.md` / `docs/` for prose).
2. If the change belongs in canonical docs (for example a new secret in GitHub Actions), update **`.github/workflows/`** or **`docs/`** first, then **one line** here pointing agents to it.
3. Prefer **copy-paste-ready commands** and **exact env var names** so future agents do not need to grep the repo cold.
