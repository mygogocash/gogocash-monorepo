# GoGoCash Admin — runbook

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_SECRET` | JWT/session encryption (required for auth). |
| `NEXTAUTH_URL` | Canonical app URL for NextAuth callbacks. |
| `NEXT_PUBLIC_IMAGE_OPT_HOSTS` | Optional comma-separated hostnames (no `https://`) added to `next.config` image `remotePatterns` and to client-side allow-list for optimized `next/image`. Example: `cdn.example.com,api.example.com`. |
| `BUILD_FOR_FIREBASE` | Set to `1` for static export build. |
| `STANDALONE` | Set to `1` for Docker/Node standalone output. |
| `ANALYZE` | Set to `true` when running `npm run analyze` (bundle report). |

Copy from `.env.example` and adjust for each environment.

## Scripts

- `npm run setup:local` — create `.env.local` from `.env.example` with a generated `NEXTAUTH_SECRET` (no-op if `.env.local` exists).
- `npm run dev` — local dev server.
- `npm run build` / `npm start` — production build and serve.
- `npm run lint` — ESLint (currently clean in-repo; re-run after large changes).
- `npm run analyze` — production build with `@next/bundle-analyzer` (opens browser report).

## Performance work completed (summary)

- React Query defaults tuned in `src/lib/query/queryClient.ts`.
- Stable `queryKey`s; quest offers list uses `["quest-offers"]` only (not modal state).
- MUI `DataGrid` lazy-loaded on heavy offer/withdraw detail routes.
- `QuestTable` code-split on the quest page.
- Images use `RemoteOrBlobImage` + `src/config/imageHosts.ts` for allow-listed optimization.

## Release QA checklist (manual)

1. Sign in and open **Dashboard**.
2. **Offers** — list loads; edit modal previews; row actions.
3. **Offer detail** — coupon grid loads.
4. **Withdraw** — list and **withdraw detail** grids.
5. **Quest** — page loads; create modal; task logo preview (file + offer).
6. **Category / Banner** — tables and form image previews.
7. Toggle **light/dark** theme — no long flash on hard refresh.
8. If using real image URLs: confirm they load and add hosts to `NEXT_PUBLIC_IMAGE_OPT_HOSTS` if optimization is desired.
