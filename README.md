# gogocash-monorepo

GoGoCash monorepo — npm workspaces + Turborepo. Node 22.

## Apps
| Path | App | Stack | Platforms | Source repo (merged) |
|------|-----|-------|-----------|----------------------|
| `apps/admin` | Admin panel | Next.js | web | `gogocash_admin` (`staging`) |
| `apps/api` | Backend API | NestJS | — | `gogocash_api` (`staging`) |
| `apps/app` | Customer app | Expo | web · iOS · Android | `gogocash_app/apps/mobile` (`expo-module`) |
| `apps/landing` | Marketing site | Next.js | web (SEO) | `gogocash-landing-page` (`main`) |

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

> Migration in progress on branch `migrate/monorepo`. Each source repo's history is preserved via `git subtree`.
> Staging-only; production cutover requires explicit approval. See `MONOREPO_EXECUTION_PLAN.md`.
