# Railway MongoDB single-node replica-set runbook

This runbook documents the procedure used to convert a GoGoCash Railway
MongoDB service from a standalone server to an authenticated single-node
replica set. Dev and staging have both been converted and verified (see Status
below); the procedure remains the reference for any future environment. It
does not authorize production. Withdrawals, task-v2 accounting, and
policy-integrity migrations use MongoDB transactions and must refuse
standalone topology.

This is a maintenance-window operation. Stop API ingress and every database
writer, take a verified backup, and keep writers stopped until the transaction
smoke tests and candidate API readiness checks pass.

## Status (2026-07-20)

Dev and staging Railway Mongo are converted and verified: both run authenticated
single-node replica sets (rs0; `mongo:8.0.4` on dev, `mongo:8.3.4` on staging)
and MongoDB transactions commit. All 18 QUEST_TASK_V2_REQUIRED_INDEXES plus the
canonical fence doc `quest_source_config_fence` (fence_key
`task-v2-source-config-v1`, revision 0) are in place on both environments. The
index migration has been executed on both: the legacy unique
`conversions.conversion_id_1` was dropped and recreated non-unique, with
identity uniqueness now enforced by the partial unique composite index
`uniq_conversion_provider_identity` on (source, provider_account,
provider_conversion_id); the staging pre-check found 0 duplicate identity
groups across 2907 string-identity conversions. `conversion_id_1` must remain
non-unique even if `QUEST_TASK_V2_ENABLED` is later set false — the composite
index now carries the uniqueness guarantee. The policy/category integrity
migration has been applied on both Railway environments (writers drained,
quarantine=0) and policy endpoints serve.

**Production / beta API does not use this Railway Mongo service.** `api-beta`
points at **MongoDB Atlas** (`mongodb+srv://…/gogocash`), which already provides
replica-set topology + sessions. Policy integrity for beta was applied on Atlas
(2026-07-20, #407) — see `docs/policy-category-integrity-rollout.md`. This
runbook still does **not** authorize converting the unused Railway production
Mongo volume unless/until the API URI is deliberately cut over to it.

Known failure mode from the rollout: if any required index conflicts with an
existing same-name index (e.g. `conversion_id_1` still unique), `createIndex`
silently no-ops, `QuestTaskTransactionService.assertReady()` throws every
tick, and the outbox consumer's drain loop swallows the error — outbox rows
sit `status: pending` with `attempts: 0` and no error logs.

## 1. Record the exact target before changing it

From a clean checkout of the candidate SHA, capture credential-free provider
state:

```bash
railway status --environment "$ENVIRONMENT" --json \
  > "railway-${ENVIRONMENT}-mongo-before.json"
railway service list --environment "$ENVIRONMENT" --json \
  > "railway-${ENVIRONMENT}-services-before.json"
```

Review the candidate API service's `MONGO_URI` in Railway without printing it
to a terminal or evidence file. Record these non-secret values separately:

```bash
export MONGO_SERVICE='<exact Railway Mongo service name>'
export MONGO_SERVICE_HOST='<host component used by the candidate API>'
export MONGO_DATABASE='<explicit database path used by the candidate API>'
```

`MONGO_SERVICE_HOST` is derived from the API URI. For example, an API URI using
`mongo-staging.railway.internal` requires replica-set member host
`mongo-staging.railway.internal:27017`. Do not substitute
`mongodb.railway.internal`, `localhost`, a public TCP-proxy host, or a service
name from a different environment.

The API URI must include an explicit database. After conversion it must include
`replicaSet=rs0` and must not include `directConnection=true`.

## 2. Back up and prove restoreability

Take a backup through the reviewed source connection without exposing the URI:

```bash
mongodump --uri "$MONGO_URI" --gzip \
  --archive="mongo-rs-${ENVIRONMENT}-${CANDIDATE_SHA}.archive.gz"
shasum -a 256 "mongo-rs-${ENVIRONMENT}-${CANDIDATE_SHA}.archive.gz"
```

Restore the archive into an isolated temporary MongoDB target and compare
collection/document counts plus one application-level read. Record the archive
digest, source fingerprint, restore target fingerprint, timestamps, and result;
never record credentials. A dump that has not been restored and checked is not
accepted as rollback evidence.

## 3. Pin the compatible MongoDB runtime

Railway hosts using Linux kernel 6.19 or later can hit MongoDB SERVER-121912.
Use a custom Docker service pinned to a known-good MongoDB 8.x image
(currently `mongo:8.0.4` on dev and `mongo:8.3.4` on staging), with its
persistent volume mounted at `/data/db`. The MongoDB process must start with:

```text
GLIBC_TUNABLES=glibc.pthread.rseq=1
```

Do not use `glibc.pthread.rseq=0`; it reproduces the startup failure observed on
the Railway hosts. Configure the variable at service scope or export that exact
value in the reviewed start command. Keep the official image entrypoint in the
startup path so first-run root-user initialization still occurs.

## 4. Create the internal-authentication keyfile

Authentication plus `--replSet` requires a keyfile. Open an interactive shell
inside the MongoDB service using the Railway dashboard shell or current CLI:

```bash
railway ssh --environment "$ENVIRONMENT" --service "$MONGO_SERVICE"
```

Inside that service shell, create the key on the persistent volume:

```bash
umask 077
openssl rand -base64 756 > /data/db/mongo-keyfile
chown mongodb:mongodb /data/db/mongo-keyfile
chmod 400 /data/db/mongo-keyfile
ls -l /data/db/mongo-keyfile
```

The final line must show a regular file owned by `mongodb` with mode `400`.
Never copy the key contents into Railway logs, a ticket, or an evidence file.

Set the service start command through the Railway dashboard to retain the
compatible runtime setting and start the authenticated replica set:

```text
sh -lc 'export GLIBC_TUNABLES=glibc.pthread.rseq=1; exec /usr/local/bin/docker-entrypoint.sh mongod --replSet rs0 --keyFile /data/db/mongo-keyfile --ipv6 --bind_ip ::,0.0.0.0 --setParameter diagnosticDataCollectionEnabled=false'
```

Deploy the MongoDB service and wait for `mongod` to become reachable. Keep API
and background writers stopped.

## 5. Initiate from inside the Railway network

Private Railway DNS resolves only inside the project network. Do not use local
`railway run` for `rs.initiate()`; it runs on the operator machine. Reopen the
Mongo service with `railway ssh` (or use the dashboard shell), then set the
reviewed host and initiate through localhost:

```bash
export MONGO_SERVICE_HOST='<exact host component from the candidate API MONGO_URI>'
mongosh --host 127.0.0.1 --port 27017 \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password \
  --authenticationDatabase admin
```

Enter the configured root password only at the interactive prompt; do not place
it in the command line or shell history.

In `mongosh`:

```javascript
const memberHost = `${process.env.MONGO_SERVICE_HOST}:27017`;
if (!/^[a-z0-9][a-z0-9.-]+\.railway\.internal:27017$/i.test(memberHost)) {
  throw new Error(`Refusing unreviewed replica-set member host: ${memberHost}`);
}
rs.initiate({ _id: "rs0", members: [{ _id: 0, host: memberHost }] });
```

Wait for the member to elect itself PRIMARY. If the set was already initiated,
inspect `rs.conf()` instead of blindly initiating again.

## 6. Verify topology and transactions before restoring traffic

Still inside `mongosh`, run:

```javascript
const hello = db.adminCommand({ hello: 1 });
if (hello.setName !== "rs0" || hello.isWritablePrimary !== true) {
  throw new Error(`Replica set is not PRIMARY: ${tojson(hello)}`);
}

const cfg = rs.conf();
const expectedHost = `${process.env.MONGO_SERVICE_HOST}:27017`;
if (cfg.members.length !== 1 || cfg.members[0].host !== expectedHost) {
  throw new Error(`Unexpected replica-set config: ${tojson(cfg)}`);
}

const smokeCollection = `__transaction_smoke_${Date.now()}`;
const session = db.getMongo().startSession();
try {
  session.startTransaction();
  const collection = session
    .getDatabase(process.env.MONGO_DATABASE)
    .getCollection(smokeCollection);
  collection.insertOne({ step: 1 });
  collection.insertOne({ step: 2 });
  session.commitTransaction();
  if (collection.countDocuments({}) !== 2) {
    throw new Error("Transaction smoke count mismatch");
  }
} catch (error) {
  try {
    session.abortTransaction();
  } catch {}
  throw error;
} finally {
  db.getSiblingDB(process.env.MONGO_DATABASE)
    .getCollection(smokeCollection)
    .drop();
  session.endSession();
}
```

Set `MONGO_DATABASE` in the service shell to the explicit API database before
running the smoke test. Record only the sanitized topology, exact member host,
candidate SHA, and pass/fail result.

Update the candidate API URI to use the same internal host and explicit database
with `replicaSet=rs0`, redeploy the exact candidate SHA, and verify:

1. deployment proof reports the requested environment and exact SHA;
2. the API topology/readiness probe reports replica-set transaction support;
3. task-v2, withdrawal, and policy migration dry-run checks pass;
4. every old writer remains stopped before any policy-latch apply.

Only then follow the writer-drain and apply contract in
`docs/policy-category-integrity-rollout.md` and restore candidate-only traffic.
(Already applied on dev and staging — writers drained, quarantine=0, policy
endpoints serving; this step applies only to future environments.)

## 7. Moving data to a replacement Railway Mongo service

If kernel compatibility requires a new custom service rather than converting
the existing volume, initialize and verify the replacement replica set first.
Restore through a reviewed public TCP proxy while API writers remain stopped:

```bash
mongorestore \
  --uri "mongodb://<encoded-user>:<encoded-password>@<proxy-host>:<proxy-port>/<database>?authSource=admin&directConnection=true" \
  --gzip --archive="mongo-rs-${ENVIRONMENT}-${CANDIDATE_SHA}.archive.gz"
```

`directConnection=true` is permitted only for the operator's public-proxy
restore. It must not be placed in the API URI. Compare source and destination
counts, rerun the transaction smoke, and switch only the candidate API after
the replacement passes.

## Forward repair and recovery

Once `rs.initiate()` succeeds or any data/index migration starts, do not revert
the start command to standalone MongoDB. That would disable transactions and
can expose partially migrated state.

- If the member host is wrong, keep writers stopped, connect locally inside the
  service, review `rs.conf()`, and repair it with a deliberate `rs.reconfig()`.
- If the node will not become PRIMARY, preserve the volume and logs, correct
  keyfile ownership/runtime/configuration, and restart the same replica set.
- If the target is unrecoverable, restore the verified archive into an isolated
  replacement replica set, fully migrate and verify it, then switch the exact
  candidate SHA.
- Never re-enable old writers against a target that has crossed a policy or
  task-v2 migration fence.

Restoring traffic is the final step, after candidate readiness, transaction
smokes, migration status, and writer inventory all agree.
