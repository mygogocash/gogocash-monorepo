# Quest media four-file acceptance

Issue #340 uses a fail-closed acceptance path. The ordinary Admin UI has no
quest delete action, so acceptance cleanup is available only through a
superadmin route scoped to the exact QA marker, request key, immutable attempt,
revision, and one-time cleanup nonce.

The API mutation path is disabled by default. It is available only when
`QUEST_MEDIA_QA_ENABLED=true` and either the process is non-production or the
Railway environment name is exactly `staging`. It remains disabled in
production even if the feature flag is set accidentally.

Run the read-only preflight first:

```bash
export PATH=/Users/kunanonjarat/.nvm/versions/node/v24.14.1/bin:$PATH
export QUEST_MEDIA_QA_TOKEN='<superadmin Nest JWT>'
node apps/api/scripts/quest-media-qa.mjs
```

The preflight checks API health and requires the complete deployed route bundle
before it can construct or submit a quest. It performs GET requests only.

After deployment is healthy and staging mutation is explicitly approved:

```bash
node apps/api/scripts/quest-media-qa.mjs --apply --confirm-staging
```

The applied run creates four distinct tiny PNGs, submits genuine multipart
files, reloads command/quest status, probes every stored HTTPS ref, and invokes
nonce-scoped cleanup. It then probes the same four exact refs again and accepts
only provider `404` responses. Success requires the QA quest, four objects,
durable intent, and all cleanup tombstones to be absent afterward. Never close #340
from local-only evidence; retain it until this authenticated staging run passes.
