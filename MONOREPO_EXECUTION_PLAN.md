# GoGoCash Monorepo — Detailed Execution Plan (sub-agent work packets)

> **UPDATE 2026-06-14:** Monorepo is **3 apps** (`admin`, `api`, `app`). **Landing was
> removed** — it stays in its own repo (`mygogocash/gogocash-landing-page`). Ignore
> `apps/landing` task packets below.
>
> **STATUS:** Phase 0–2 packets and the Phase 3 **CI** packet (`P3-CI-1`) are **DONE**
> — all 3 apps build in path-filtered CI on `migrate/monorepo`. Remaining: the
> Phase 3 **deploy** packets (`P3-*-1`, manual `workflow_dispatch` only), Phase 4
> shared packages, Phase 5 cutover. A separate **dependency-upgrade** track is in
> flight on top of the assembled monorepo — see [`UPGRADE_PLAN.md`](UPGRADE_PLAN.md).
>
> A **security/reliability hardening** pass (money + auth) also landed on top of
> the assembled monorepo — see [`SECURITY_HARDENING.md`](SECURITY_HARDENING.md)
> (PRs #37/#39/#40; follow-ups #41–#46). Note P4 shared packages = issue #19.

> Companion to `MONOREPO_MIGRATION_PLAN.md` (the high-level decisions). This doc breaks the work
> into **self-contained tasks** a sub-agent can execute from the packet alone, each with **testable
> acceptance criteria** and explicit dependencies, so you can fan multiple agents across independent tasks.
>
> **Hard constraints (every task):** staging-only; **prod cutover needs explicit human approval**
> (separate prod GCP projects `cogent-coyote-472808-m1`, `gogocash-7518f` — never touch). gcloud default
> project is `affine-495114` (wrong) → always `--project gogocash-staging`. Nothing merges to `main`
> until the whole branch builds + staging-deploys green.

## Base facts (already established)
- Monorepo repo: **`mygogocash/gogocash-monorepo`** (private, `main`, has initial README commit).
- Tooling: **npm workspaces + Turborepo**. All apps **Node 22**.
- 4 apps: `apps/admin` (Next.js ← gogocash_admin) · `apps/api` (NestJS ← gogocash_api) · `apps/app` (Expo web+iOS+Android ← gogocash_app/apps/mobile) · `apps/landing` (Next.js ← gogocash-landing-page).
- Retire: legacy Next.js customer web (`gogocash-web`, root of gogocash_app).

## How to run this with sub-agents
- **Packet fields:** `ID · Phase · Owner(agent type) · Depends-on · Parallel? · Effort · Scope · Acceptance criteria (AC) · Rollback`.
- **Parallelize:** tasks with no unmet `Depends-on` and `Parallel?=Y` can run concurrently on different agents.
- **Phase gate:** do not start phase N+1 until every phase-N AC is green.
- **Suggested agent types:** `build-resolver` (TS/Node build+deps), `code-reviewer`, `security-reviewer`, `e2e/preview-verify`, `deploy` (gcloud/EAS via bash), `doc-updater`. One **orchestrator** (you) owns merges, gates, and prod approval.

---

## PHASE 0 — Per-repo prep (all parallel; no monorepo yet)
*Goal: every app builds from a clean clone on Node 22 with ONE lockfile; risky unknowns surfaced before merge.*

**P0-API-1 · Owner: build-resolver · Depends: — · Parallel: Y · Effort: M**
- Scope: `gogocash_api` has **3 lockfiles** (npm+yarn+pnpm). Standardize on **npm**.
- Steps: delete `yarn.lock` + `pnpm-lock.yaml`; `rm -rf node_modules`; `npm install`; fix any resolution breakage; PR to `gogocash_api` staging.
- **AC:** only `package-lock.json` remains · `npm ci` exits 0 on a clean clone · `npm run build` (nest build) exits 0 · boot-smoke: `node dist/main` responds **200/redirect on `/`** with dummy env · existing jest baseline unchanged (no NEW failures).
- Rollback: revert the PR (lockfiles restored from git).

**P0-API-2 · build-resolver · Depends: — · Parallel: Y · Effort: S** — Pin `engines.node` `>=22` + add `.nvmrc`. **AC:** `node -v` matches; CI uses Node 22.

**P0-ADMIN-1 · build-resolver · Depends: — · Parallel: Y · Effort: S** — Confirm `gogocash_admin` builds from clean clone on Node 22. **AC:** `npm ci && npm run build` (next build) exits 0; `.nvmrc` added.

**P0-ADMIN-2 · doc-updater · Depends: — · Parallel: Y · Effort: S** — Replace the **stale** cloudbuild configs with the REAL deploy (build → `asia-southeast1-docker.pkg.dev/gogocash-staging/gogocash/gogocash-admin` w/ `logging: LEGACY`, then `gcloud run deploy gogocash-admin --region asia-southeast1`). Delete/quarantine `cloudbuild.staging.yaml` (dead GKE target). **AC:** a single documented, working `gcloud builds submit` config + deploy command in the repo; no references to the nonexistent `gogocash-staging-cluster`.

**P0-APP-1 · e2e/preview-verify · Depends: — · Parallel: Y · Effort: M** — **Expo Web export smoke** (gate for retiring the Next.js web). `cd apps/mobile && expo export --platform web`; serve `dist/`. **AC:** export exits 0 · served site loads · **login + wallet + one core screen** render and function on web · console has no fatal errors. **If AC fails → BLOCK P1-5's web deletion.**

**P0-APP-2 · code-explorer · Depends: — · Parallel: Y · Effort: M** — Inventory the legacy Next.js web (`gogocash-web`) routes/features and confirm each is covered by the Expo app. **AC:** a checklist mapping every legacy web route → Expo equivalent (or flagged gap). Gaps block deletion.

**P0-LAND-1 · build-resolver · Depends: — · Parallel: Y · Effort: M** — Audit `mygogocash/gogocash-landing-page` (clone): package manager, lockfile, Node, build cmd, **current deploy host** (Vercel? Cloud Run?). Normalize to npm + Node 22. **AC:** documented build cmd + deploy host · `npm ci && npm run build` exits 0 · single lockfile.

**P0-INFRA-1 · doc-updater · Depends: — · Parallel: Y · Effort: S** — Define monorepo conventions: pkg naming `@gogocash/*`, shared base `tsconfig`, lint/prettier base, Turborepo task names. **AC:** a `CONVENTIONS.md` agreed before scaffolding.

**▣ Phase 0 gate:** P0-API-1, P0-APP-1, P0-LAND-1 green; each app clean-clone-builds on Node 22 / single lockfile.

---

## PHASE 1 — Monorepo shell + history-preserving merge
*Goal: all 4 apps in `gogocash-monorepo` (on a branch) with git history preserved; nothing optimized yet.*

**P1-1 · build-resolver · Depends: P0-INFRA-1 · Parallel: N · Effort: M** — Scaffold root: clone `gogocash-monorepo`, branch `migrate/monorepo`; add root `package.json` (`"workspaces":["apps/*","packages/*"]`), `turbo.json`, `.nvmrc` (22), base `tsconfig`, `.gitignore`; push. **AC:** `npm install` resolves workspaces with zero apps yet · `npx turbo --version` works · pushed to branch.

**P1-2 · build-resolver · Depends: P1-1, P0-API-1 · Parallel: Y · Effort: S** — `git subtree add --prefix=apps/api https://github.com/mygogocash/gogocash_api.git staging`. **AC:** `apps/api/` populated · `git log apps/api` shows original history · no files lost.

**P1-3 · build-resolver · Depends: P1-1, P0-ADMIN-1 · Parallel: Y · Effort: S** — subtree-add admin → `apps/admin`. **AC:** as P1-2 for admin.

**P1-4 · build-resolver · Depends: P1-1, P0-LAND-1 · Parallel: Y · Effort: S** — subtree-add landing → `apps/landing`. **AC:** as P1-2 for landing.

**P1-5 · build-resolver · Depends: P1-1, P0-APP-1(green), P0-APP-2(no gaps) · Parallel: N · Effort: M** — subtree-add `gogocash_app`; `git mv apps/mobile apps/app`; **delete** legacy Next.js web (root `src/`, `next.config.*`, etc.). **AC:** `apps/app/` is the Expo app · legacy web files gone · `git log` retains app history · the Next.js web remains recoverable from history.

**▣ Phase 1 gate:** all 4 `apps/*` present on `migrate/monorepo`, histories intact, legacy web deleted.

---

## PHASE 2 — Wire workspaces; builds byte-identical
*Goal: `turbo run build lint typecheck test` reproduces each app's CURRENT behavior. No internal refactors.*

**P2-1 · build-resolver · Depends: P1-2..5 · Parallel: N · Effort: M** — Name packages `@gogocash/{api,admin,app,landing}`; reconcile root vs per-app deps; one root `package-lock.json`. **AC:** `npm ci` clean at root · `npm ls` no unmet/phantom deps.

**P2-2 · build-resolver · Depends: P2-1 · Parallel: N · Effort: M** — Turborepo pipeline (`build`,`lint`,`typecheck`,`test`) with per-app `outputs`. **AC:** `turbo run build` builds **all 4** · each app's artifact == its pre-merge artifact (spot-check) · `turbo run typecheck` green.

**P2-3 · build-resolver (Expo) · Depends: P2-1 · Parallel: Y · Effort: L** — Metro workspace config (`watchFolders` = repo root, `nodeModulesPaths` = root + app). **AC:** `cd apps/app && expo start --web` boots · `expo export --platform web` exits 0 from the workspace · `expo run` resolves native deps (no "unable to resolve module" from hoisting).

**P2-4 · code-reviewer · Depends: P2-2,P2-3 · Parallel: N · Effort: S** — Review hoisting/dedupe for version conflicts (esp. React/React-DOM/RN across web+native). **AC:** no duplicate React majors · no peer-dep warnings that break builds.

**▣ Phase 2 gate:** `turbo run build lint typecheck test` green for all 4; each app runs identically to pre-merge.

---

## PHASE 3 — Deploys from the monorepo (STAGING only; verify each before retiring old pipeline)
*Goal: every app deploys to staging FROM the monorepo branch; path-filtered so apps deploy independently.*

**P3-CI-1 · deploy · Depends: P2-2 · Parallel: N · Effort: M** — Path-filtered CI skeleton (GH Actions `paths:` per app or `turbo-ignore`). **AC:** a commit touching only `apps/api/**` triggers ONLY the api pipeline; other apps' jobs are skipped.

**P3-API-1 · deploy · Depends: P3-CI-1 · Parallel: Y · Effort: M** — Port `gogocash_api` `ci.yml`+`deploy-staging.yml` to monorepo context (build from `apps/api`, Docker context handled, keep the boot-smoke required check + the `RESEND_API_KEY` dummy fix). **AC:** PR to `apps/api` runs boot-smoke green · `deploy-staging` deploys to the staging API Cloud Run service · staging `/` responds.

**P3-ADMIN-1 · deploy · Depends: P3-CI-1 · Parallel: Y · Effort: M** — Create the admin CI workflow it lacks today: build image to `asia-southeast1.../gogocash-admin` (LEGACY logging) from `apps/admin` Docker context, then `gcloud run deploy gogocash-admin --region asia-southeast1 --project gogocash-staging`. **AC:** workflow builds + deploys staging admin · new Cloud Run revision serves the new image digest · `/` returns 307 (auth redirect = healthy).

**P3-APPWEB-1 · deploy · Depends: P2-3 · Parallel: Y · Effort: M** — Wire Expo web static deploy: `expo export --platform web` → host (decide: Firebase Hosting / Cloudflare Pages / Cloud Run static). **AC:** customer web staging URL serves the Expo export · login+wallet work · no chunk 404s (basePath/assetPrefix correct).

**P3-APPNATIVE-1 · deploy (EAS) · Depends: P2-3 · Parallel: Y · Effort: M** — EAS build/submit/update from `apps/app` in the monorepo (set `eas.json` + workspace root). **AC:** `eas build --profile preview` succeeds from `apps/app` · OTA `eas update` to the staging channel applies on a device/simulator.

**P3-LAND-1 · deploy · Depends: P3-CI-1, P0-LAND-1 · Parallel: Y · Effort: S** — Landing deploy from `apps/landing` to its existing host, path-filtered. **AC:** a change under `apps/landing/**` deploys ONLY landing · staging landing URL serves the new build.

**▣ Phase 3 gate:** all 4 apps staging-deploy from `migrate/monorepo`, each verified live; path-filtering proven (one-app change ≠ rebuild-all).

---

## PHASE 4 — Extract shared packages (the payoff)
*Goal: kill the cross-repo hand-sync. Do AFTER everything deploys, so a regression here can't block deploys.*

**P4-1 · build-resolver · Depends: P3-* · Parallel: N · Effort: L** — `packages/contracts`: API DTO/response types; api exports, web+app import `@gogocash/contracts`. **AC:** types resolve on web AND native (Metro + tsconfig paths) · `turbo run typecheck` green · the hand-maintained duplicates are deleted.

**P4-2 · build-resolver · Depends: P3-* · Parallel: Y · Effort: M** — `packages/i18n`: ICU catalogs. **PRESERVE the split** — web-synced `en/th.json` vs hand-edited `mobile-overlay.*`. **AC:** `tc()`/translate still resolves on app · web i18n unchanged · no catalog overwrite of the mobile overlay.

**P4-3 · build-resolver · Depends: P2-1 · Parallel: Y · Effort: S** — `packages/tsconfig` shared base; apps extend it. **AC:** all apps `extends` it · `turbo run typecheck` green.

**▣ Phase 4 gate:** shared packages consumed; duplicates removed; all builds/deploys still green.

---

## PHASE 5 — Cutover + retire old repos
**P5-1 · orchestrator · Depends: P4-* · Effort: S** — Merge `migrate/monorepo` → `main`; add branch protection (required checks = the per-app boot-smoke/build). **AC:** `main` is the monorepo; protections on.
**P5-2 · deploy · Depends: P5-1 · Effort: M** — Repoint staging deploys to the monorepo; freeze old-repo pipelines. **AC:** staging deploys originate from monorepo only.
**P5-3 · orchestrator · Depends: P5-2 + soak · Effort: S** — Old repos → archived/read-only mirrors after a soak window. **AC:** old repos archived; rollback still possible from history.
**P5-4 · deploy · Depends: P3-APPWEB-1 verified · Effort: M** — Cut the **customer web domain** over to the Expo Web export; fully retire Next.js web. **AC:** customer web domain serves Expo Web; old web decommissioned.
**P5-PROD · orchestrator · Depends: explicit human approval · Effort: —** — Prod cutover. **GATED — do not start without explicit go.**

---

## Parallelization map (which agents can run at once)
- **Phase 0:** every task parallel (different repos) — fan 5–6 agents.
- **Phase 1:** P1-1 alone → then P1-2/3/4 parallel; P1-5 after its P0 gates.
- **Phase 2:** mostly serial (P2-1→P2-2→P2-4); P2-3 (Metro) parallel to P2-2.
- **Phase 3:** P3-CI-1 first → then P3-{API,ADMIN,APPWEB,APPNATIVE,LAND} all parallel.
- **Phase 4:** P4-1 serial-ish; P4-2/P4-3 parallel.
- **Phase 5:** serial; prod gated.

## Risks (ranked) & global rollback
1. **API 3-lockfile drift** (P0-API-1) — different installs per lockfile. Highest hidden risk; do first.
2. **Expo "retire-now" web regressions** — mitigated by P0-APP-1/2 gates + Next.js web in git history + domain rollback.
3. **Metro monorepo resolution** (P2-3) — web+native hoisting. Budget L effort.
4. **Per-app Docker context + path-filtered CI** (P3) — easy to rebuild-all by accident.
5. **Deploy auth/secrets** — gcloud project, EAS creds, host tokens.
- **Global rollback:** all work on `migrate/monorepo`; old repos stay live mirrors until P5-3; prod untouched throughout.
