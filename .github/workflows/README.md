# GitHub Actions — monorepo CI

GitHub only reads workflows from this directory (`.github/workflows/` at the
repo root). The CI/deploy files still nested under `apps/api/.github/` are
**inert** — GitHub never runs them. This root workflow set replaces them for
build/test. (The landing site is a separate repo, not in this monorepo.)

## What runs

`ci.yml` — runs on pull requests and pushes targeting `staging`, `main`, and
the `migrate/monorepo` integration branch.

A `changes` job (using `dorny/paths-filter`) detects which app changed, then
gates each app's job. A change confined to `apps/<X>/**` runs only `<X>`'s
job; a change to shared root config (`package.json`, `package-lock.json`,
`turbo.json`, `.nvmrc`, `.npmrc`, `ci.yml`) fans out to every app.

Every job uses `actions/setup-node@v4` on **Node 22** and installs with a bare
`npm ci` at the repo root (the root `.npmrc` already sets
`legacy-peer-deps=true`).

| App | Workspace / package | Jobs | Gate |
|-----|---------------------|------|------|
| admin | `gogocash-admin` | lint/test (informational) → build | build is the gate |
| app (mobile) | `@gogocash/mobile` | typecheck/test (informational) → web export | web export is the gate |
| api | `gogocash-api` | **lint** | **gate** (repaired in Tier 1 #1) |
| api | `gogocash-api` | **unit tests** | **gate** (repaired in Tier 1 #6 — 30 suites / 385 tests) |
| api | `gogocash-api` | **build + boot smoke** | **required** |

Notes:
- **app (`@gogocash/mobile`)** has no `build` script — Expo apps export via EAS,
  not a CI build. Its build-equivalent gate is `typecheck` + the unit and render
  test suites. It also has no `lint` script, so lint is omitted (not invented).
- **api lint and unit tests are now gates.** They were informational while the
  api carried lint debt (eslint 8) and 13 red `nest g` scaffold stubs. Tier 1 #1
  cleared the lint debt and Tier 1 #6 replaced the stubs with 310 real behavior
  tests (30 suites / 385 tests green), so both dropped `continue-on-error`.
- **api build + boot smoke is the required gate.** It runs `nest build`
  (type-check) and boots `node dist/main` against an ephemeral Mongo service,
  probing `/`, to catch DI / bootstrap crashes that tsc and unit specs both
  miss. Dummy env values are used (`RESEND_API_KEY=re_ci_smoke_dummy`,
  `MONGO_URI`/`JWT_SECRET`/`JWT_ADMIN_SECRET`/`FIREBASE_PROJECT_ID` dummies,
  `NODE_OPTIONS=--max-old-space-size=4096`). No real credentials are referenced;
  the smoke test never sends email.

### Branch protection

In Settings → Branches, add rules for `staging` and `main`:

- **Require** status checks: `api build + boot smoke (required)`, `api lint`,
  and `api unit tests` — all three api jobs are gates now.

## Deploys are MANUAL ONLY (Phase 3 pending)

There is **no auto-deploy in this repo**. This CI builds and tests only —
nothing here ships to staging or production.

The per-app `deploy-*.yml` files under `apps/api/.github/` were **not** ported
to root. They were push-triggered
(`on: push` to `staging` / `production` → Cloud Run / Firebase Hosting), and
porting them as-is would auto-deploy from this branch. That is intentionally
avoided.

When deploys are wired up (Phase 3), each deploy workflow added here **must**
be triggered by `workflow_dispatch` (manual) only — **never `on: push`** — so a
human explicitly initiates every staging/production release. Until then,
deploys remain a documented manual step performed outside CI.
