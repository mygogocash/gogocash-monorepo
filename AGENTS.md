# AGENTS.md — GoGoCash Web (gogocash-web)

Concise guidance for AI coding agents and contributors. **Deep architecture and feature notes live in [README.md](./README.md).**

## Project

- **Stack:** Next.js 16 (App Router), TypeScript (strict), React, Tailwind CSS v4.
- **Data:** TanStack React Query + Axios (`src/lib/axios/client.ts`).
- **Auth:** NextAuth JWT; primary identity is **Firebase** (`src/lib/authFirebase.ts`). **Crossmint** remains mounted for wallet/subscription-related flows—do not rip out Crossmint plumbing without product sign-off and browser verification.
- **i18n:** `next-intl`, locales `en` / `th` (see `src/i18n/`). User-facing copy belongs in `src/messages/en.json` and `src/messages/th.json` together (parity checked by `npm run i18n:check`).
- **Imports:** Path alias `@/*` → `src/*` (`tsconfig.json`).

## Where to start (by task)

| Area                     | Good entry points                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| App shell & providers    | `src/app/layout.tsx`, `src/providers/ProviderDefault.tsx`                                                   |
| HTTP + tokens            | `src/lib/axios/client.ts`                                                                                   |
| Firebase auth / NextAuth | `src/lib/authFirebase.ts`, `src/app/api/auth/[...nextauth]/route.ts`                                        |
| Login UI                 | `src/features/auth/component/LoginComponent.tsx`, `src/hooks/useFirebaseLogin.ts`                           |
| Crossmint wrapper        | `src/lib/crossmint/SettingCrossmint.tsx`, `src/hooks/useSafeCrossmint.ts`, `src/hooks/useCrossmintLogin.ts` |
| Feature UI               | `src/features/*`, shared pieces under `src/components/*`                                                    |
| Env schema               | `src/env.ts`                                                                                                |

## Conventions agents should follow

1. **Scope:** Change only what the task requires; match existing patterns (imports at top, naming, component style).
2. **Types:** Run `npx tsc --noEmit` after non-trivial edits. Respect SDK types (e.g. Crossmint `SDKExternalUser`—`twitter` is a string, not `{ id }`).
3. **i18n:** Add or update keys in **both** `en.json` and `th.json` for new user-visible strings.
4. **Analytics / consent:** Meta Pixel and GTM paths are consent-gated—see README “Analytics” sections before adding tracking.
5. **Verification:** For auth, analytics, or wallet changes, **browser verification** matters; lint/build alone is not always enough.

## Commands (verify before claiming done)

```bash
npm run validate   # lint + format:check + i18n:check + test
npm run build        # production build (catches Next/TS issues)
npx tsc --noEmit     # TypeScript only (fast)
```

Use `npm run lint:fix` and `npm run format` when appropriate.

## Repository facts (avoid surprises)

- Many route segments use **`"use client"`** for interactivity and SDK compatibility.
- Profile routes live under `src/app/[locale]/(profile)/` with `AuthGuard`.
- `ClientLayoutWrapper` coordinates rendering with Crossmint readiness—avoid reordering providers without understanding `ProviderDefault.tsx`.
- Backend contract: `NEXT_PUBLIC_API_URL` (see `.env.example`).

When in doubt, search the codebase for an existing pattern before introducing a new abstraction.
