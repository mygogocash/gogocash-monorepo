# Quest media four-file create and replacement acceptance

Issues #340 and #636 use a fail-closed acceptance path. The ordinary Admin UI
has no quest delete action, so acceptance cleanup is available only through a
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
files, then replaces all four through the same
`PATCH /point/admin-quest/:id/campaign` route used by Admin Edit Quest. It
reloads the replacement command and quest from the primary database, proves the
first four objects were retired, probes all four replacement HTTPS refs, and
invokes nonce-scoped cleanup. It accepts only provider `404` responses for both
object generations after their respective cleanup fences. Success requires the
QA quest, eight objects, both durable intents, and all cleanup tombstones to be
absent afterward. Never close #340 or #636 from local-only evidence; retain the
issue until this authenticated staging run passes.
