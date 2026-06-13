# GoGoCash Monorepo Migration Plan

> Status: PLAN (not started). Staging-only throughout; **prod cutover requires explicit approval**.
> Decisions locked 2026-06-13.

## Decisions (locked)
- **One monorepo, 4 apps.** Tooling: **npm workspaces + Turborepo** (all repos are Node 22 + npm; lowest-friction).
- **Customer frontend = ONE Expo app** (`apps/app`) → web + iOS + Android. Already wired: `react-native-web`, `expo-router`, `web:{bundler:"metro"}`, `export:web` script, `eas.json`.
- **Legacy Next.js customer web (`gogocash-web`) retired immediately** — Expo Web replaces it. (Safety rail: verify `expo export --platform web` builds + smoke critical flows BEFORE deleting; keep Next.js web in git history for rollback.)
- **Admin stays Next.js** (`apps/admin`, web-only; React Native Web is poor for data-dense dashboards).
- **Landing page stays Next.js, INTO the monorepo as `apps/landing`** (from `mygogocash/gogocash-landing-page`) — SSR/SSG for SEO, NOT Expo Web. Path-filtered CI keeps its deploy independent; shares `packages/i18n` + brand tokens.
- **Out of scope:** other org repos (`gogocash_public`, `gogocash-overview-dashboard`, `gogocash-analytics-dashboard`, `gogocash-support-bridge`, services) — not in this monorepo unless decided later.

## Source repos → target
| Source | → | Monorepo path | Stack | Deploy |
|--------|---|---------------|-------|--------|
| `mygogocash/gogocash_admin` | → | `apps/admin` | Next.js 16 | Cloud Run asia-southeast1 |
| `mygogocash/gogocash_api` | → | `apps/api` | NestJS | Cloud Run (GH Actions) |
| `mygogocash/gogocash_app` `apps/mobile` | → | `apps/app` | Expo (web+iOS+Android) | web: static export · native: EAS |
| `mygogocash/gogocash_app` root (`gogocash-web`) | → | **RETIRED** | Next.js | (deleted) |
| `mygogocash/gogocash-landing-page` | → | `apps/landing` | Next.js (SSR/SSG) | its current host — path-filtered, independent |

## Target layout
```
gogocash-monorepo/            # mygogocash/gogocash-monorepo (PRIVATE) — created 2026-06-13
├─ apps/
│  ├─ admin/    (Next.js)
│  ├─ api/      (NestJS)
│  ├─ app/      (Expo — web + iOS + Android)
│  └─ landing/  (Next.js — SSR/SSG, SEO)
├─ packages/
│  ├─ contracts/   # shared API DTO/response types (retire TBackend hand-sync)
│  ├─ i18n/        # shared ICU catalogs (keep web-synced vs mobile-overlay split!)
│  └─ tsconfig/    # shared base configs
├─ package.json    # "workspaces": ["apps/*","packages/*"]
├─ turbo.json
└─ .nvmrc          # 22
```

## Phase 0 — per-repo prep (small PRs in each repo, before merge)
1. **API lockfile cleanup** 🚩 highest hidden risk — 3 lockfiles (npm+yarn+pnpm). Pick npm: delete `yarn.lock`+`pnpm-lock.yaml`, regen `package-lock.json`, confirm build + boot-smoke green.
2. **Expo Web export smoke** — run `expo export --platform web`; serve `dist/`; verify login + wallet + one core screen. Gate for the "retire now" deletion.
3. Pin Node 22 in every `package.json` engines; add root `.nvmrc`.
4. **Audit `gogocash-landing-page`** (not checked out locally) — package manager, build, and its current deploy host (Vercel? Cloud Run?). Same lockfile/Node-22 normalization as the others.
5. Clean-clone build check for all 4 apps.

## Phase 1 — shell + history-preserving merge
- Create `mygogocash/gogocash` (recommended) OR rename `gogocash_app`.
- `git subtree add --prefix=apps/admin   https://github.com/mygogocash/gogocash_admin.git        <branch>`
- `git subtree add --prefix=apps/api     https://github.com/mygogocash/gogocash_api.git          <branch>`
- `git subtree add --prefix=apps/landing https://github.com/mygogocash/gogocash-landing-page.git <branch>`
- From `gogocash_app`: `git mv apps/mobile apps/app`; **delete** the root Next.js web (src/, next.config, etc.) after Phase 0 smoke passes.
- Add root `package.json` workspaces, `turbo.json`, `.nvmrc`.

## Phase 2 — wire workspaces; builds byte-identical
- `turbo run build lint test` reproduces each app's *current* behavior. No internal refactors yet.
- Configure Metro for the workspace (`watchFolders`, `nodeModulesPaths`) — Metro resolution here is finicky; budget time.
- Gate: each app builds + runs exactly as pre-merge.

## Phase 3 — deploys (STAGING only; verify each before retiring old pipeline)
- **admin** → Cloud Run asia-southeast1; build context = monorepo root, `apps/admin/Dockerfile` (use `turbo prune --scope=admin`). Add the CI workflow it lacks today.
- **api** → Cloud Run; update existing GH Actions build context to monorepo.
- **app web** → `expo export --platform web` → static host (pick: Firebase Hosting / Cloudflare Pages / Cloud Run static). Cut customer web domain over from Next.js.
- **app native** → EAS build → submit → EAS Update (OTA) from `apps/app`.
- **landing** → Next.js build to its current host (Vercel/Cloud Run — confirm during Phase 0 audit); path-filtered so marketing deploys stay independent.
- **Path-filtered CI**: a push builds/deploys only the changed app (`paths:` / `turbo-ignore`).

## Phase 4 — shared packages (the payoff)
- `packages/contracts`: API response/DTO types (web+mobile stop hand-mirroring; resolves on web AND native via Metro + tsconfig paths).
- `packages/i18n`: ICU catalogs. **Preserve the split** — web-synced `en/th.json` vs hand-edited `mobile-overlay.*`.

## Risks (ranked)
1. **API 3-lockfile resolution drift** — different installs per lockfile. Fix in Phase 0.
2. **"Retire now" web regressions** — parity gaps. Mitigation: Phase 0 export smoke + Next.js web kept in git history + fast domain rollback.
3. **Metro monorepo resolution** (web + native) for shared packages.
4. **Per-app Docker context + path-filtered CI** rework.

## Rollback / safety
- Old repos = read-only mirrors until monorepo staging deploys proven for all 3 apps.
- Whole migration on a branch; cut over only when everything builds + staging-deploys green.
- **Prod untouched** until explicit approval (standing guardrail). Separate prod GCP projects: `cogent-coyote-472808-m1`, `gogocash-7518f` — never touched.

## Base repo (DECIDED)
- **`mygogocash/gogocash-monorepo`** (PRIVATE) — created 2026-06-13, default branch `main`, initial README commit. Ready for Phase 1 subtree merges.

## Suggested first step
Phase 0.1 (API lockfile cleanup) — highest-value, lowest-risk, surfaces the worst landmine early. Own PR to `gogocash_api` staging, TDD/boot-smoke verified.
