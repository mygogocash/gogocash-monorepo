# GoGoCash

> **Thailand cashback platform** — a Turborepo monorepo: NestJS API, Next.js admin dashboard, and an Expo (web / iOS / Android) customer app.

npm workspaces + Turborepo · Node 22 · staging-first (production cutover is gated).

## Apps
| Path | App | Stack | Platforms | Source repo (merged) |
|------|-----|-------|-----------|----------------------|
| `apps/admin` | Admin panel | Next.js | web | `gogocash_admin` (`staging`) |
| `apps/api` | Backend API | NestJS | — | `gogocash_api` (`staging`) |
| `apps/app` | Customer app | Expo | web · iOS · Android | `gogocash_app/apps/mobile` (`expo-module`) |

> The marketing/landing site stays in its **own repo** (`mygogocash/gogocash-landing-page`) — not part of this monorepo.

## Packages (planned)
- `packages/contracts` — shared API DTO/response types
- `packages/i18n` — shared ICU catalogs (web-synced vs mobile-overlay split preserved)
- `packages/tsconfig` — shared base configs

## Commands
```bash
npm install          # install all workspaces
npm run build        # turbo run build (all apps)
npm run lint
npm run typecheck
npm run test
```

## Status

The monorepo lives on **`main`** (`mygogocash/gogocash-monorepo`) — the migration is complete (each source repo's history is preserved via `git subtree`) and the old `migrate/monorepo` integration branch has been **retired**, so `main` is the single canonical branch. Dependency modernization (eslint 8→9, **TypeScript 6**, **NestJS 11**, **jest 30**, **mongoose 8→9**, **firebase-admin 13→14**, MUI 7→9, Expo align) is landed — see [`UPGRADE_PLAN.md`](UPGRADE_PLAN.md).

A money/auth **security & reliability hardening** pass also landed — see [`SECURITY_HARDENING.md`](SECURITY_HARDENING.md) (PRs #37/#39/#40; follow-ups #41–#46).

The customer app's **GoGoTrack** Android cashback-detection feature is being built (PR #65) — a real native `UsageStatsManager` detector (replacing a no-op stub) + the interactive permission / timeline / settings UI + the detect→activate→deeplink nudge. The JS layer is TDD-verified; the native module is **device-gated** (EAS dev-client build, owner-`EXPO_TOKEN`). See [`apps/app/README.md`](apps/app/README.md#gototrack--android-cashback-detection) and [`apps/app/modules/gototrack-detector/README.md`](apps/app/modules/gototrack-detector/README.md).

**CI gates** (`.github/workflows/ci.yml`, path-filtered per app): api lint · api unit tests · api build + boot smoke + Mongo integration; admin test + build; app typecheck/unit/render + web export. The per-app jobs are the gates directly — the `ci-gate` aggregator has been **removed** (no branch protection enforces it on this free-plan repo; see [`.github/workflows/README.md`](.github/workflows/README.md)). Admin lint stays informational (#45).

> Staging-only; production cutover requires explicit approval. See [`MONOREPO_EXECUTION_PLAN.md`](MONOREPO_EXECUTION_PLAN.md).
