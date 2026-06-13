# Migrate marketing from Framer → this Next.js site

Production target: **`https://gogocash.co`** (DNS on **Cloudflare**, hosting on **Firebase** for this repo). The app is a **static export** (`output: "export"` → `out/`).

---

## 1. Inventory Framer (parity checklist)

| Area | Action |
|------|--------|
| **URLs** | Export a list of every path Framer serves (`/`, `/pricing`, etc.). Map each to a route under `app/` or note a **gap** to build. |
| **Copy & layout** | Screenshot or copy text from Framer; compare to Next pages (`app/page.tsx`, `about`, `learn`, locales `en`/`th`/…). |
| **Images / video** | Download originals (not only compressed exports). Place under `public/`; prefer WebP/AVIF where you optimize. |
| **Forms** | Note submit endpoints (Framer form, Zapier, etc.). Reimplement with your API route **only if** you add a server (this export has **no** API on Firebase Hosting alone—use external form services or a separate backend). |
| **Embeds** | Lottie, Cal.com, Typeform, etc.—recreate in React components or `next/script` as needed. |
| **SEO** | Title, description, OG image per page—mirror in `metadata` / `layout.tsx` / page exports. |
| **Analytics** | List Framer snippets (GA, Meta Pixel, etc.). Wire via **env** in this repo (see `.env.example`; Firebase Analytics and LINE Tag are supported in code). |

**Routes already in this repo (reference):** `/`, `/about`, `/search`, `/learn`, `/learn/[slug]`, `/how-gogocash-makes-money`, `/privacy-policy`, `/term-of-use`, `/terms-of-service`, locale roots `/en`, `/th`, `/id`, `/ja`, `/tw`, `/sitemap.xml`.

---

## 2. Close content & UX gaps in code

1. Implement any **missing pages** or sections compared to Framer.
2. Set production env before **`npm run build`**:
   - `NEXT_PUBLIC_SITE_URL=https://gogocash.co`
   - Firebase / LINE Tag analytics keys as needed (see `.env.example`).
3. Run **`npm run verify`** locally; fix lint/tests/build.
4. Optional: **`npm run test:e2e`** for critical flows.

---

## 3. Staging on Firebase (smoke test)

1. Build: **`npm run build`** → confirm **`out/index.html`** exists.
2. Deploy: **`npm exec -- firebase deploy --only hosting`** (see [`firebase-deploy.md`](./firebase-deploy.md)).
3. Test **`https://landing-page-4ae23.web.app`** (or a **preview channel** if you use `firebase hosting:channel:deploy`).

---

## 4. Custom domain `gogocash.co` on Firebase Hosting

1. Firebase Console → **Hosting** → **Add custom domain** → `gogocash.co` and `www.gogocash.co` (if you use both).
2. Complete **domain verification** (TXT) and add **SSL** records Firebase shows.
3. In **Cloudflare** (DNS only for the records Firebase specifies—often **DNS only / grey cloud** for Google-hosted SSL to avoid double-proxy issues; if Firebase docs allow proxied, follow their current guidance).

### Optional: apply apex DNS via Cloudflare API

If Firebase **Quick setup** asks you to remove specific A/AAAA records and add `A @ → 199.36.158.100`, you can run the repo script (needs **`jq`** and **`curl`**):

1. In Cloudflare: **My Profile → API Tokens → Create Token** → template **Edit zone DNS** or custom with **Zone → DNS → Edit** scoped to **`gogocash.co`** only. **Do not** commit the token or paste it in chat.
2. Copy **`.env.cloudflare.example`** → **`.env.cloudflare`**, set **`CLOUDFLARE_API_TOKEN`** (zone id is prefilled; file is gitignored).
3. Optional dry run: `DRY_RUN=1 npm run dns:cloudflare-firebase-apex`  
   Apply: `npm run dns:cloudflare-firebase-apex`  
   (Needs **`jq`** and **`curl`**. Or export the same vars and run `./scripts/cloudflare-firebase-dns-setup.sh`.)
4. Return to **Firebase Hosting** → **Verify**, then complete any **SSL** records the console shows next.

**Redirects (www ↔ apex):** Prefer **one** canonical host. Options:

- **Firebase Hosting** redirects (if you add `redirects` in `firebase.json`), and/or  
- **Cloudflare** single redirect rule (e.g. `www` → `https://gogocash.co`).

Static export does **not** run a Node server; do redirects at **Firebase** or **Cloudflare**, not only in middleware (middleware won’t run on pure static hosting).

---

## 5. Cutover plan (low downtime)

1. **Lower TTL** on relevant DNS records at Cloudflare a day ahead (optional).
2. Final **`npm run build`** with production `NEXT_PUBLIC_*`.
3. **`firebase deploy --only hosting`** (or your CI script).
4. **Switch DNS** to Firebase per console instructions; wait for **SSL active** on custom domain.
5. **Test:** homepage, locales, search, learn, legal pages, mobile, CTAs (App Store / LINE / etc.).

---

## 6. Post-cutover

| Task | Notes |
|------|--------|
| **Google Search Console** | Add property for `https://gogocash.co`, verify, submit `sitemap.xml`. |
| **Update links** | App deep links, emails, ads, social bios → `https://gogocash.co`. |
| **Framer** | Cancel or downgrade after TTL flush; keep a **PDF/export** of old copy for reference. |

---

## 7. Risk summary

| Risk | Mitigation |
|------|------------|
| **URL changes** | Cloudflare **bulk redirects** from old Framer paths to new Next paths. |
| **Forms on Framer** | Plan external handler or small API elsewhere before removing Framer. |
| **Analytics gaps** | Compare event names in GA / your analytics tools before and after; document renames. |
| **Double proxy** | Cloudflare orange cloud + Firebase SSL can conflict—follow Firebase’s DNS instructions. |

---

## Related docs

- [`docs/firebase-deploy.md`](./firebase-deploy.md) — build and deploy to Firebase Hosting
