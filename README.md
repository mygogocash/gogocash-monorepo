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

The monorepo is assembled on branch `migrate/monorepo` (all three apps build in CI; each source repo's history is preserved via `git subtree`). Dependency modernization is underway per [`UPGRADE_PLAN.md`](UPGRADE_PLAN.md) — done so far: Tier 0 safe bumps, eslint 8→9, **TypeScript 6**, **NestJS 11**, **jest 30**, plus a full api test-suite repair (30 suites / 385 tests). All three `api` CI jobs (lint, unit tests, build + boot smoke) are required gates. Next: mongoose 8→9.

> Staging-only; production cutover requires explicit approval. See [`MONOREPO_EXECUTION_PLAN.md`](MONOREPO_EXECUTION_PLAN.md).
