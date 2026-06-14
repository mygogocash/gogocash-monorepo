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
| admin | `gogocash-admin` | lint (informational) · test · build | **test + build are gates**; lint stays informational (~54 react-hooks/compiler warnings — tracked in #45) |
| app (mobile) | `@gogocash/mobile` | typecheck · unit · render · web export | **all four are gates** (P2-CI) |
| api | `gogocash-api` | **lint** | **gate** |
| api | `gogocash-api` | **unit tests** | **gate** |
| api | `gogocash-api` | **build + boot smoke + integration** | **required** — `nest build`, boots vs ephemeral Mongo, then runs the `checkWithdraw`↔Mongo integration test (`test/withdraw-balance.e2e-spec.ts`) |
| (all) | — | **`ci-gate` (required)** | **aggregator** — always runs, `needs` every app job, passes when each one succeeded or was skipped (path-filtered), fails only on a real failure |

Notes:
- **app (`@gogocash/mobile`)** has no `build` script — Expo apps export via EAS,
  not a CI build. Its gates are `typecheck` + the unit and render suites + the
  web export. It has no `lint` script, so lint is omitted (not invented).
- **admin test + app typecheck/unit/render are gates** (P2-CI — all verified
  green). Admin **lint** stays informational: ~54 React-Compiler / react-hooks
  warnings-as-errors (`setState-in-effect`, `refs-during-render`) are real
  pre-existing component debt — see #45. Drop its `continue-on-error` after that
  cleanup.
- **api lint + unit tests are gates.**
- **api build + boot smoke + integration is the required gate.** It runs
  `nest build` (type-check), boots `node dist/main` against an ephemeral Mongo
  service probing `/` (catches DI/bootstrap crashes), then runs the
  `checkWithdraw`↔Mongo integration test (covers the mongoose-9 aggregation
  risk the mock-based unit specs can't). Dummy env values only
  (`RESEND_API_KEY=re_ci_smoke_dummy`, `MONGO_URI`/`JWT_SECRET`/
  `JWT_ADMIN_SECRET`/`FIREBASE_PROJECT_ID` dummies); the smoke test never sends
  email.
- **`ci-gate`** is the always-runs aggregator that makes branch protection work
  with the path-filtered per-app jobs (a job that doesn't run reports `skipped`,
  not a blocking `pending`).

### Branch protection

The per-app jobs are **path-filtered**, so requiring them directly would block
any PR that doesn't touch that path (the check never reports). Require **only**
the aggregator instead:

- In Settings → Branches (or a Ruleset) for `migrate/monorepo` and `main`,
  require the single status check **`CI gate (required)`**. Suggested:
  `enforce_admins: false` (owner can bypass in an emergency), no required
  reviews (solo maintainer).
- ⚠️ **Currently blocked:** classic branch protection *and* rulesets both return
  `403 — Upgrade to GitHub Pro or make this repository public` on this private
  free-plan repo. Enable after upgrading the plan or making the repo public
  (tracked in #44).

## Staging CD — auto build, manual release

Staging deploys use an **auto-build + approval-gate** split (a real-money
platform: builds are automatic, releases are a deliberate human action). All
three Cloud Run lanes share two **reusable** workflows so the deploy logic lives
in one place.

| Workflow | Trigger | Does |
|----------|---------|------|
| **`build-staging.yml`** | auto: push to `migrate/monorepo` (+ manual) | reuses `ci.yml` as the gate, then builds + pushes a `:staging-candidate` image for each **changed** app (path-filtered). **No deploy.** |
| **`release-staging.yml`** | manual `workflow_dispatch` (pick app + tag) | deploys the chosen candidate image to Cloud Run, then **health-smokes** the new revision. The dispatch **is** the approval. |
| `_build-push.yml` | `workflow_call` | reusable: WIF auth → optional prebuild → docker build → push `:sha` + `:staging-candidate`. |
| `_deploy-cloudrun.yml` | `workflow_call` | reusable: WIF auth → `gcloud run deploy` a given tag → post-deploy `curl` health check. |

Both reusables run in the **`staging` GitHub Environment** (holds the `GCP_*` WIF
vars; GCP Secret-Manager secrets stay in GCP via `--set-secrets`).

**Approval gate:** GitHub Environment required-reviewer protection needs a paid
plan for private repos (see #44). Until then the approval is the manual
`release-staging` dispatch. Once on Pro/public, add required-reviewers to the
`staging` environment and the release pauses for one-click approval (no workflow
change needed).

**Native app** (`deploy-app-native-eas.yml`) stays a manual EAS scaffold
(needs `EXPO_TOKEN`).

> The legacy `deploy-{api,admin,app-web}-staging.yml` lanes are kept as a manual
> fallback during cutover; delete them once `build-staging` + `release-staging`
> are verified on a real merge.
