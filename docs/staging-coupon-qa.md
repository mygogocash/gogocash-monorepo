# Issue #339 coupon QA sentinel

`scripts/staging-coupon-qa.sh` is dry-run by default. Its apply path is limited
to the dev and staging API allowlist and refuses every database write unless the
target database already contains a matching environment sentinel. The QA script
never creates or changes that sentinel.

An operator with access to the intended non-production database must provision
this document separately (once per database), after independently confirming
the selected database:

```javascript
db.environment_sentinels.insertOne({
  _id: "gogocash-issue-339-coupon-qa-v1",
  environment: "dev", // use "staging" only in the staging database
  purpose: "issue-339-coupon-contract-qa",
  write_enabled: true,
  provisioned_at: new Date(),
});
```

Never provision this sentinel in production. To disable the QA write path,
set `write_enabled` to `false` or remove the sentinel.

Commit the QA scripts and application change before running apply mode. Apply
mode refuses untracked or locally modified QA scripts, then compares the local
full Git SHA to the public read-only `GET /offer/deployment-proof` response.
Railway must expose its standard `RAILWAY_GIT_COMMIT_SHA` and
`RAILWAY_ENVIRONMENT_NAME` variables to the API process. A missing, short, or
invalid Railway revision/environment fails closed. Generic build variables
such as `COMMIT_SHA`, `GIT_COMMIT_SHA`, `APP_ENV`, or `GOGOCASH_ENV` are not
deployment proof and are ignored.

Create a high-entropy QA evidence signing key (at least 32 bytes) in the
operator's secret store. Use the same key for the consecutive dev and staging
runs. Do not commit it or print it.

Run dev first, only after that exact revision is deployed to dev:

```bash
MODE=apply QA_ENV=dev CONFIRM_NONPROD_WRITE=issue-339 \
  QA_EVIDENCE_HMAC_KEY='<secret 32+ byte key>' \
  MONGO_URI='<dev database URI>' ./scripts/staging-coupon-qa.sh
```

The dev run writes `evidence/issue-339/dev-evidence.json` only after the public
coupon contract passes and cleanup proves exact absence of the two coupons and
offer. The evidence is HMAC-SHA256 signed, expires after six hours, and binds:

- the exact dev API URL and environment identity;
- the exact local and deployed 40-character Git revision;
- SHA-256 hashes of the QA shell, Mongo helper, and evidence helper;
- public-contract success and exact cleanup counts.

After the same revision is deployed to staging, use the fresh dev evidence to
gate staging:

```bash
MODE=apply QA_ENV=staging CONFIRM_NONPROD_WRITE=issue-339 \
  QA_EVIDENCE_HMAC_KEY='<same secret 32+ byte key>' \
  DEV_EVIDENCE_FILE=evidence/issue-339/dev-evidence.json \
  MONGO_URI='<staging database URI>' ./scripts/staging-coupon-qa.sh
```

Staging verifies the signature, freshness, environment/API identity, revision,
and current helper hashes before any fixture write. It separately queries the
staging deployment-proof endpoint and requires that deployed revision to equal
both local HEAD and the dev evidence. A copied `PASS` line, stale evidence,
tampered file, different revision, or different QA helper is rejected.

The apply path records all generated IDs before its first fixture insert. Its
EXIT cleanup validates ownership of every existing exact-ID document before it
deletes anything, deletes coupons before their offer, and then verifies absence
using exact IDs. Ownership drift stops cleanup without deleting any fixture.

## Affiliate mint reservation retention and PDPA handling

Affiliate mint reservations protect the external Involve mint from duplicate
calls across API replicas. Provider-unstarted records and safely committed
records receive an `expires_at` value and are eligible for the partial Mongo
TTL index:

- `reserved` expires after 90 days. A safe reclaim renews that absolute expiry,
  and the provider-start transition atomically removes it before any external
  mint request can begin.
- `committed` expires after 90 days, and is marked committed only after the
  exact durable deeplink cache row exists. That cache row follows the existing
  affiliate/customer data lifecycle and remains the no-remint authority after
  the reservation expires.
- `pre_mint_failed` expires after 90 days because authentication failed before
  any provider request began; retrying or deleting that record cannot duplicate
  an external mint.

`provider_started` never receives a TTL, because the provider outcome may be
uncertain. `provider_succeeded` is also retained until its durable result can be
committed into the deeplink cache. These records are retained for manual
reconciliation and operational/financial integrity; an account-deletion flow
must not describe them as immediately hard-deleted.

Use the audit-first, non-production recovery procedure in
[`affiliate-mint-reconciliation.md`](./affiliate-mint-reconciliation.md) for
durable-cache convergence and hosted index verification.

PDPA data exports include an explicit safe projection of the user's reservation
history (merchant/offer, requested destination, state, tracked link, and public
timestamps). They intentionally exclude the deterministic ID, destination
hash, owner/attempt fence tokens, lease expiry, internal failure code, and TTL
date.
