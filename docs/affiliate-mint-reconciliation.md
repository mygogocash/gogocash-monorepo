# Affiliate mint reservation reconciliation

This runbook recovers the narrow state where Involve already returned a tracked
link and the durable deeplink cache contains that exact result, but the matching
reservation is still `provider_succeeded`. It never calls Involve, retries a
mint, or alters `provider_started` rows.

## Audit first

Run the command against a Mongo URI whose path names the intended database.
Audit is the default and performs no writes:

```bash
QA_ENV=dev \
MONGO_URI='<dev Mongo URI with database path>' \
node scripts/reconcile-affiliate-mint-reservations.cjs
```

The command scans a bounded batch of 100 reservations by default (maximum 500)
and prints one JSON report. It also counts all `provider_started` rows and lists
at most the selected batch size as opaque IDs for the manual workflow below.
Output contains counts and opaque hashed record IDs only; it never prints
destinations, tracked links, credentials, owner tokens, or provider responses.

## Provision the non-production write sentinel

An apply run requires an explicit sentinel in the same database. Create it only
in the intended dev or staging database:

```javascript
db.environment_sentinels.updateOne(
  { _id: "gogocash-affiliate-mint-reconciliation-v1" },
  {
    $set: {
      purpose: "affiliate-mint-reconciliation",
      environment: "dev", // use "staging" in staging
      write_enabled: true,
      updated_at: new Date(),
    },
  },
  { upsert: true },
);
```

Remove or disable the sentinel after the maintenance window.

## Apply an exact reconciliation

Use the exact confirmation string for the selected environment:

```bash
QA_ENV=dev \
RECONCILIATION_MODE=apply \
CONFIRM_NONPROD_WRITE=affiliate-mint-reconcile-dev \
MONGO_URI='<dev Mongo URI with database path>' \
node scripts/reconcile-affiliate-mint-reservations.cjs
```

For staging, use `QA_ENV=staging` and
`CONFIRM_NONPROD_WRITE=affiliate-mint-reconcile-staging`. Production, an absent
or invalid sentinel, and a missing or incorrect confirmation are refused.

A row is changed only when all of these agree exactly:

- deterministic reservation identity, source, user, merchant, offer, and
  destination hash;
- the full canonical requested destination;
- a credential-free HTTP(S) tracked link in both the reservation and the durable
  deeplink cache;
- current reservation state `provider_succeeded`.

Apply also requires the exact unique
`affiliate_destination_identity_unique_v1` index across source, user, offer,
merchant, and destination hash. The command reads up to two cache rows for each
identity and treats more than one as ambiguous even if one row matches. A
missing or altered unique index and any cache identity mismatch refuse the
entire apply batch. The write is an atomic compare-and-set from
`provider_succeeded` to `committed`, so concurrent API replicas or command runs
are safe. A successful rerun reports zero new commits.

## `provider_started` manual evidence workflow

Do not delete, expire, reset, or automatically retry `provider_started`. Its
provider outcome is uncertain and a retry could create a duplicate external
mint.

1. Record the opaque reservation ID from the audit report and the maintenance
   window in the incident ticket.
2. Correlate server request logs, Involve provider logs, and any finance or
   conversion evidence using restricted operational access. Never paste raw
   links, credentials, or user identifiers into the ticket.
3. If provider success and the exact returned tracked link can be proven, first
   establish the matching durable deeplink cache row through an approved,
   separately reviewed repair. Then rerun this command in audit mode.
4. If the outcome cannot be proven, retain the row for financial integrity and
   escalate. Do not infer failure from missing application logs.

## Retention and anonymization scope

- `reserved`, `pre_mint_failed`, and `committed` carry an absolute 90-day
  `expires_at` and are covered by the partial TTL index.
- `reserved` expiry is renewed only by a safe pre-provider reclaim and is
  atomically removed before `provider_started`.
- `provider_started` and `provider_succeeded` have no TTL. They remain until the
  provider outcome is resolved or exact durable-cache convergence commits the
  result.
- PDPA export uses a safe projection. It excludes internal deterministic IDs,
  identity hashes, fence or owner tokens, lease and TTL fields, and internal
  failure codes. Account-deletion language must not promise immediate removal
  of unresolved provider/financial evidence.

## Verify hosted TTL behavior

After deployment, inspect the actual dev and staging databases:

```javascript
db.affiliate_mint_reservations.getIndexes();
```

Confirm `affiliate_mint_reservation_safe_expiry_v2` has `expireAfterSeconds: 0`
and a partial filter containing exactly `reserved`, `pre_mint_failed`, and
`committed`. Sample recent records and confirm `provider_started` and
`provider_succeeded` do not carry `expires_at`. MongoDB's TTL monitor is
asynchronous, so allow for its normal scan interval before declaring an expired
test row undeleted.

Version 1 used the same key with a narrower filter and did not cover `reserved`.
The API migration creates v2 first and only then drops v1. If a hosted database
still shows v1, do not drop it until v2 exists with the exact options above. Once
v2 is confirmed, remove the obsolete index explicitly:

```javascript
db.affiliate_mint_reservations.dropIndex(
  "affiliate_mint_reservation_safe_expiry_v1",
);
```

Also confirm `db.deeplinks.getIndexes()` contains the exact unique
`affiliate_destination_identity_unique_v1` index before apply. If it is missing,
resolve duplicate identities and let the API recreate it; never bypass the
command's refusal.
