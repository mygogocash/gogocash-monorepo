# GitHub Actions — monorepo CI

GitHub only reads workflows from this directory (`.github/workflows/` at the
repo root). The CI/deploy files still nested under `apps/api/.github/` and
`apps/landing/.github/` are **inert** — GitHub never runs them. This root
workflow set replaces them for build/test.

## What runs

`ci.yml` — runs on pull requests and pushes targeting `staging` and `main`.

A `changes` job (using `dorny/paths-filter`) detects which app changed, then
gates each app's job. A change confined to `apps/<X>/**` runs only `<X>`'s
job; a change to shared root config (`package.json`, `package-lock.json`,
`turbo.json`, `.nvmrc`, `.npmrc`, `ci.yml`) fans out to every app.

Every job uses `actions/setup-node@v4` on **Node 22** and installs with a bare
`npm ci` at the repo root (the root `.npmrc` already sets
`legacy-peer-deps=true`).

| App | Workspace / package | Jobs | Gate |
|-----|---------------------|------|------|
| admin | `gogocash-admin` | lint → test → build | required |
| landing | `gogocash-landing` | lint → test → typecheck → build | required |
| app (mobile) | `@gogocash/mobile` | typecheck → test → test:render | required |
| api | `gogocash-api` | lint, unit tests | **informational** (`continue-on-error`) |
| api | `gogocash-api` | **build + boot smoke** | **required** |

Notes:
- **app (`@gogocash/mobile`)** has no `build` script — Expo apps export via EAS,
  not a CI build. Its build-equivalent gate is `typecheck` + the unit and render
  test suites. It also has no `lint` script, so lint is omitted (not invented).
- **api lint/test are informational** by design: 14/21 jest suites are red on
  `staging` today (`nest g` scaffolding stubs with no deps wired). Drop
  `continue-on-error` once they're repaired.
- **api build + boot smoke is the required gate.** It runs `nest build`
  (type-check) and boots `node dist/main` against an ephemeral Mongo service,
  probing `/`, to catch DI / bootstrap crashes that tsc and unit specs both
  miss. Dummy env values are used (`RESEND_API_KEY=re_ci_smoke_dummy`,
  `MONGO_URI`/`JWT_SECRET`/`JWT_ADMIN_SECRET`/`FIREBASE_PROJECT_ID` dummies,
  `NODE_OPTIONS=--max-old-space-size=4096`). No real credentials are referenced;
  the smoke test never sends email.

### Branch protection

In Settings → Branches, add rules for `staging` and `main`:

- **Require** status check: `api build + boot smoke (required)`
- Do **not** require `api lint (informational)` / `api unit tests
  (informational)` until those suites are repaired.

## Deploys are MANUAL ONLY (Phase 3 pending)

There is **no auto-deploy in this repo**. This CI builds and tests only —
nothing here ships to staging or production.

The per-app `deploy-*.yml` files under `apps/api/.github/` and
`apps/landing/.github/` were **not** ported to root. They were push-triggered
(`on: push` to `staging` / `production` → Cloud Run / Firebase Hosting), and
porting them as-is would auto-deploy from this branch. That is intentionally
avoided.

When deploys are wired up (Phase 3), each deploy workflow added here **must**
be triggered by `workflow_dispatch` (manual) only — **never `on: push`** — so a
human explicitly initiates every staging/production release. Until then,
deploys remain a documented manual step performed outside CI.
