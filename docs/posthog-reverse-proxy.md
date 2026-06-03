# PostHog reverse proxy (beat ad-blockers)

Ad/tracker blockers drop ~10–30% of requests to `*.posthog.com`. Routing PostHog
through a **same-origin** path (`https://gogocash.co/ingest`) recovers most of that
data. The client is already proxy-ready:

```bash
NEXT_PUBLIC_POSTHOG_HOST=https://gogocash.co/ingest
NEXT_PUBLIC_POSTHOG_UI_HOST=https://us.posthog.com   # toolbar/links stay on the real host
```

`lib/posthog-client.ts` passes `api_host` (ingestion) and `ui_host` (app) accordingly.
**Only set `NEXT_PUBLIC_POSTHOG_HOST` to the proxy path AFTER the proxy is deployed**
— otherwise every event 404s.

PostHog US uses two upstreams: `us.i.posthog.com` (events/flags) and
`us-assets.i.posthog.com` (the `/static/*` recorder + array bundles).

---

## Option A — Cloudflare Worker (recommended here)

This site already fronts on Cloudflare, and a Worker needs **no Blaze plan** and no
change to the Firebase deploy. Use PostHog's official Worker:

1. PostHog → **Settings → Project → Reverse proxy → Cloudflare**, copy the Worker.
2. Deploy it on a route like `gogocash.co/ingest/*`.
3. Set the two env vars above in the build env; redeploy the site.

Docs: https://posthog.com/docs/advanced/proxy/cloudflare

## Option B — Firebase Cloud Function (requires Blaze)

Firebase Hosting can't rewrite to an external host, so this needs a function.
**Caveats:** requires the **Blaze** plan, the deploy pipeline must `firebase deploy
--only functions,hosting`, and it adds cold-start latency. Test after deploying.

`functions/package.json`:

```json
{
  "name": "functions",
  "engines": { "node": "20" },
  "main": "index.js",
  "dependencies": { "firebase-functions": "^5" }
}
```

`functions/index.js`:

```js
const { onRequest } = require("firebase-functions/v2/https");

const API_HOST = "us.i.posthog.com";
const ASSET_HOST = "us-assets.i.posthog.com";

exports.posthogProxy = onRequest({ region: "asia-southeast1" }, async (req, res) => {
  const path = req.path.replace(/^\/ingest/, "");
  const host = path.startsWith("/static/") ? ASSET_HOST : API_HOST;
  const qs = req.originalUrl.includes("?") ? `?${req.originalUrl.split("?")[1]}` : "";
  const upstream = await fetch(`https://${host}${path}${qs}`, {
    method: req.method,
    headers: { ...req.headers, host },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.rawBody,
  });
  res.status(upstream.status);
  upstream.headers.forEach((v, k) => {
    if (!["content-encoding", "transfer-encoding", "content-length"].includes(k)) {
      res.setHeader(k, v);
    }
  });
  res.send(Buffer.from(await upstream.arrayBuffer()));
});
```

Add to `firebase.json` (under `hosting`) — only after the function exists:

```json
"rewrites": [
  { "source": "/ingest/**", "function": "posthogProxy" }
]
```

Deploy: `firebase deploy --only functions,posthogProxy,hosting`, then set the env
vars and confirm events reach PostHog with a blocker enabled.

Docs: https://posthog.com/docs/advanced/proxy

---

## Verify

With the proxy live + env set, load the site, accept cookies, and confirm requests go
to `gogocash.co/ingest/*` (not `*.posthog.com`) in DevTools → Network, and events land
in PostHog → Activity.
