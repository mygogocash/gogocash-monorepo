# Performance PR checklist

Use for changes that touch UI, data loading, analytics, or dependencies.

## Must answer

- [ ] **New dependency?** Justify size; run `npm run analyze` and note largest new chunk.
- [ ] **New `use client` boundary?** Can this stay on the server or lazy-load?
- [ ] **Images:** Using `next/image` with sensible `sizes` for responsive layouts?
- [ ] **Lists / tables:** Virtualization or pagination for large sets (e.g. Data Grid)?
- [ ] **React Query:** Appropriate `staleTime` / `gcTime` for this data? (Defaults are in `src/lib/query/queryClient.ts`.)
- [ ] **Third-party scripts:** Loaded with `next/script` and `afterInteractive` or `lazyOnload` (not sync in `<head>` without cause)?

## Analytics / tracking

- [ ] Meta Pixel / GTM: not duplicated; consent rules respected if applicable.

## Verification

- [ ] `npm run validate` passes.
- [ ] For risky bundles: `npm run build && npm run perf:check-budget`.

## Anti-patterns to flag in review

- `import { Something } from "@mui/icons-material"` barrel — prefer `@mui/icons-material/IconName`.
- Importing `ethers` or Firebase auth on routes that do not need them — use dynamic import or route-level code splitting.
- `fetch` in client that could be server `fetch` with caching.
