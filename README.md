# gogocash-monorepo

GoGoCash monorepo — npm workspaces + Turborepo. Node 22.

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

The monorepo is assembled on branch `migrate/monorepo` (each source repo's history is preserved via `git subtree`). Dependency modernization (eslint 8→9, **TypeScript 6**, **NestJS 11**, **jest 30**, **mongoose 8→9**, **firebase-admin 13→14**, MUI 7→9, Expo align) is landed — see [`UPGRADE_PLAN.md`](UPGRADE_PLAN.md).

A money/auth **security & reliability hardening** pass also landed — see [`SECURITY_HARDENING.md`](SECURITY_HARDENING.md) (PRs #37/#39/#40; follow-ups #41–#46).

**CI gates** (`.github/workflows/ci.yml`, path-filtered per app): api lint · api unit tests · api build + boot smoke + Mongo integration; admin test + build; app typecheck/unit/render + web export. A single **`ci-gate`** aggregator is the check to require in branch protection (see [`.github/workflows/README.md`](.github/workflows/README.md)). Admin lint stays informational (#45).

> Staging-only; production cutover requires explicit approval. See [`MONOREPO_EXECUTION_PLAN.md`](MONOREPO_EXECUTION_PLAN.md).
