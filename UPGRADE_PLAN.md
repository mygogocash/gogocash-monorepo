# GoGoCash dependency and runtime upgrade plan

> Last refreshed: 2026-07-14. This file records the current repository state,
> completed local upgrade work, verification evidence, and the remaining
> staging-gated migrations. Do not blanket-upgrade the monorepo.

## Current stack

| Surface         | Supported baseline                                   |
| --------------- | ---------------------------------------------------- |
| Runtime         | Node.js 24 LTS                                       |
| Package manager | npm 10.9.8                                           |
| API             | NestJS 11, Express 5, Mongoose 9, MongoDB driver 7   |
| Admin           | Next.js 16.2.10, React 19.2.7, MUI 9, Tailwind CSS 4 |
| Customer app    | Expo SDK 57, React Native 0.86, React 19.2.7         |
| Shared tooling  | Turbo 2.10.5, Jest 30, Vitest 4                      |
| TypeScript      | 7.0.2 for API/app/MCP; 5.9.3 for Next.js admin       |

## Implemented locally

### 1. Reproducible dependency baseline

- A clean root `npm ci --include=dev` succeeds.
- `npm ls --depth=0` has no invalid or missing direct dependencies.
- The root lockfile is the only dependency lock for all workspaces.
- The previously observed invalid-package list was stale `node_modules`, not a
  manifest failure.

### 2. Expo SDK 57 compatibility

- SDK-managed packages are aligned with Expo 57:
  - `@sentry/react-native ~7.11.0`
  - `@shopify/flash-list 2.0.2`
  - `react-native-safe-area-context ~5.7.0`
  - `react-native-screens 4.25.2`
  - `react-native-svg 15.15.4`
- The root pins `react-native-screens 4.25.2` so npm workspaces do not hoist a
  second native version through Expo Router.
- Local GoGoTrack modules import `requireOptionalNativeModule` from `expo`; the
  app no longer declares `expo-modules-core` directly.
- React, React DOM, and TypeScript remain explicit Expo validation exclusions:
  React stays on the tested 19.2.7 pair, while the app intentionally uses the
  TypeScript 7 native compiler and a plain JavaScript Expo config.
- `npx expo install --check` reports dependencies up to date.
- `npx expo-doctor@latest` passes all 20 checks.

Native dependency changes require an EAS preview rebuild. An OTA update alone
is not sufficient proof.

### 3. Retired Crossmint integration removal

- Removed `@crossmint/server-sdk` and its transitive dependency tree.
- Removed obsolete `CROSSMINT_*` configuration from Railway templates/scripts,
  GitHub workflows, and legacy Cloud Build bindings.
- Removed dormant provider calls and write paths.
- Preserved historical `id_crossmint` schema/DTO/PDPA export compatibility.
- Preserved `/auth/sign-in` as a deprecated, fail-closed compatibility route;
  both its guard and service boundary reject it without provider calls.
- Local `npm audit` fell from 26 to 20 moderate findings after removal.

### 4. Safe maintenance updates

- AWS SDK S3 packages: 3.1086.0
- MongoDB driver: 7.5.0 (within the existing 7.x range)
- Firebase web SDK: 12.16.0
- Stripe: 22.3.1
- Turbo: 2.10.5
- PostCSS: 8.5.19
- Oxlint: 1.74.0
- Knip: 6.26.0 (the existing root quality-gate script is now reproducible on a
  clean checkout)
- Direct Node types: 24.13.3
- Archiver types remain on the compatible 6.x line; Archiver itself remains 7.x.

### 5. Node and npm standardization

- Active `.nvmrc`, CI, CodeQL, staging workflows, Cloud Build, App Engine, and
  Railway Docker build paths now use Node 24.
- GitHub and Docker install paths activate npm 10.9.8 explicitly.
- Cloud Build `_NPM_VERSION` is 10.9.8.
- Workspace `engines.node` require Node 24 or newer.
- Direct `@types/node` dependencies target Node 24. Transitive tools may carry
  their own newer type packages without changing the application's compile
  target.

### 6. ApexCharts post-install compatibility

The admin still needs its stacked-bar radius behavior. ApexCharts 5.16 changed
the generated bundle layout, so the old patch only emitted warnings and left
runtime bundles unpatched. The replacement:

- patches CommonJS, ESM, minified, and browser bundles;
- is idempotent;
- fails installation when a future unsupported bundle layout is detected;
- has a regression test that checks every published runtime entry point.

## Verification evidence

All commands below passed locally on Node 24:

| Gate                                | Result                            |
| ----------------------------------- | --------------------------------- |
| API typecheck                       | passed                            |
| API unit tests                      | 90 suites, 990 tests passed       |
| API SWC build                       | 341 files compiled                |
| Admin typecheck                     | passed                            |
| Admin unit tests                    | 107 files, 737 tests passed       |
| Admin Next.js production build      | passed, 69 static pages generated |
| Mobile unit tests                   | 198 files, 1,320 tests passed     |
| Mobile render tests                 | 71 files, 476 tests passed        |
| Mobile typecheck                    | passed                            |
| Mobile Expo web export              | passed                            |
| GoGoTrack MCP typecheck/build/tests | passed, 3 tests                   |
| Expo Doctor                         | 20/20 checks passed               |
| Knip static analysis                | passed                            |
| Docker build configuration checks   | API, admin, app passed            |
| Modified YAML parsing               | passed                            |

## Security audit interpretation

Local npm audit currently reports 20 moderate findings and no high or critical
findings. The remaining direct report roots are Expo, Expo Splash Screen,
Firebase Admin, Firebase Tools, Next.js, and NextAuth. npm's automated remedies
propose unsafe downgrades such as Expo 57 to 46 or Next.js 16 to 9; do not run
`npm audit fix --force`.

Track these paths through supported upstream releases and GitHub Dependabot.
Do not override UUID or framework internals across majors without their owning
package's compatibility tests.

## Staging acceptance gate

Before starting the major migrations below:

1. Build an EAS Android preview with the aligned Expo native dependencies.
2. Promote this branch through the normal staging flow.
3. Verify Railway API, admin, and customer app health.
4. Verify admin login and role/permission loading.
5. Verify Top Brands reads and saves against the real staging API (#278).
6. Verify Firebase phone send/resend/reCAPTCHA behavior (#290).
7. Verify Wallet/Profile protected navigation and session restoration.
8. Verify GoGoTrack native module loading and background-monitor entry points.
9. Observe authentication and API error rates before the next major.

## Remaining major migrations

Each item gets its own branch, PR, staging observation period, and rollback.

### NextAuth 4 to Auth.js

Inventory credentials providers, session/JWT callbacks, middleware, admin role
claims, invitation flows, and staging-domain cookies before changing packages.
Add regression coverage first. Acceptance requires existing admin credentials,
role claims, refresh behavior, and unauthorized-route blocking to remain intact.

### Archiver 7 to 8

Add tests for PDPA/export filenames, directory layout, streaming, empty archives,
large archives, and cleanup errors before the major bump. Keep this separate
from auth and database changes.

### Zod 3 to 4

Limit the migration to `packages/gototrack-mcp`. Verify validation semantics,
serialized MCP errors, typecheck, build output, and client tests.

## Rollback boundaries

- Expo package alignment: revert the app manifest/lock and rebuild the preview
  binary; OTA cannot roll back native dependency changes.
- Crossmint removal: revert the API cleanup only if a verified external caller
  still needs the retired route; never re-enable token decoding without remote
  signature verification.
- Node 24: revert runtime/workflow pins to Node 22 without reverting application
  package changes.
- Safe patches: revert the manifest and lockfile together.
- ApexCharts: retain the regression test when updating the patch for a future
  bundle layout.
