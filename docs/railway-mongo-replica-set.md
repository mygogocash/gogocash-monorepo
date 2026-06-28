# Railway MongoDB → single-node replica set + data migration (GoGoCash)

**Why:** the withdrawal path uses a Mongo multi-document transaction
(`apps/api/src/withdraw/withdraw.service.ts` → `runSerializedWithdraw`: `connection.startSession()` +
`session.withTransaction(...)`). Transactions require a **replica set**. Railway's MongoDB template ships a
standalone `mongod`, which throws on every withdrawal. This converts it to a single-node replica set.

**R-tier: R0/R1** — every step that changes the start command or runs `rs.initiate()` restarts Mongo and
touches a money-path DB. Take a `mongodump`/volume backup first. Roll back by reverting the start command.

Target: Railway project **GoGoCash** / env **production** / service **MongoDB** (official `mongo` image, volume, Online).

---

## ⚠️ The critical gotcha: keyFile is mandatory
The template runs `mongod` with a **root user** (auth enabled). MongoDB's rule: **auth + `--replSet` ⇒ a
keyFile (or x.509) is required** for intra-cluster auth. The official `mongo` entrypoint **does NOT generate a
keyfile** (it strips `--replSet`/`--keyFile` during first-run init and uses the localhost exception). So adding
only `--replSet rs0` will fail to start. **You must supply a keyFile yourself**, on the persistent volume.

## Part 1 — keyFile + start command
1. Open a shell in the running MongoDB service (Railway dashboard shell, or `railway ssh`/`railway connect`).
   Create the keyfile on the **volume** (survives restarts) and lock it down:
   ```bash
   openssl rand -base64 756 > /data/db/mongo-keyfile
   chmod 400 /data/db/mongo-keyfile
   chown mongodb:mongodb /data/db/mongo-keyfile     # official image runs as user 'mongodb'
   ls -l /data/db/mongo-keyfile                       # -r-------- 1 mongodb mongodb
   ```
2. Set the MongoDB service **Custom Start Command** (dashboard → MongoDB → Settings → Deploy) to **exactly**:
   ```
   mongod --replSet rs0 --keyFile /data/db/mongo-keyfile --ipv6 --bind_ip ::,0.0.0.0 --setParameter diagnosticDataCollectionEnabled=false
   ```
   (= template default + `--replSet rs0` + `--keyFile`). Keep `--ipv6 --bind_ip ::,0.0.0.0` — private networking
   needs it. Deploy and wait for Online.

> The CLI (v5.23) cannot set a service start command and the Railway MCP `update_service` was unavailable
> (expired token); the **dashboard** is the reliable path. GraphQL `serviceInstanceUpdate { startCommand }` with
> an account API token is a scriptable fallback.
> Config-as-code does NOT apply — a database template deploys from an image, not your repo.

## Part 2 — initiate the replica set
The member `host` must be the name the **API** uses (`mongodb.railway.internal`), NOT `localhost` — a wrong host
bakes a bad advertised address into `rs.conf()` and breaks the API. Run from inside the Railway network:
```bash
railway connect MongoDB     # opens mongosh against the service
```
then:
```javascript
rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb.railway.internal:27017" }] })
```
(or one-shot: `railway run --service MongoDB mongosh "mongodb://$MONGOUSER:$MONGOPASSWORD@mongodb.railway.internal:27017/admin?directConnection=true" --eval '...'`).
A one-member set elects itself PRIMARY within seconds.

## Part 3 — verify
```javascript
rs.status()                       // set:"rs0", members[0].stateStr:"PRIMARY"
rs.conf()                         // members[0].host == "mongodb.railway.internal:27017"
// transaction smoke:
const s = db.getMongo().startSession(); s.startTransaction();
const c = s.getDatabase("test").t; c.insertOne({_id:1}); c.insertOne({_id:2}); s.commitTransaction(); s.endSession();
db.getSiblingDB("test").t.countDocuments();  // 2 → transactions work
db.getSiblingDB("test").t.drop();
```
Then redeploy `gogocash-api` and exercise a withdrawal.

## Part 4 — data migration (after Part 3)
Private networking is runtime-only (unreachable from a laptop) — restore through the **public TCP proxy**
(dashboard → MongoDB → Settings → Networking → TCP Proxy; egress is billed).
```bash
# dump from the current external staging Mongo
mongodump --uri="<STAGING_MONGO_URI>" --gzip --archive=gogocash-staging.archive.gz
# restore into Railway via the public proxy (directConnection avoids chasing the internal host)
mongorestore --uri="mongodb://<MONGOUSER>:<MONGOPASSWORD>@<PROXY_HOST>:<PROXY_PORT>/?authSource=admin&directConnection=true" \
  --gzip --archive=gogocash-staging.archive.gz
```
Verify collection counts against the source.

## Gotchas
- keyFile required (Part 1) — the #1 reason single-node-RS attempts fail.
- Changing the start command restarts Mongo → brief API errors; restart the API after.
- Member host must be `mongodb.railway.internal` (fix a bad one with `rs.reconfig(cfg,{force:true})`).
- `directConnection=true` is for laptop/proxy access only — do NOT put it in the API's connection string (the API
  needs replica-set awareness for transactions). If the driver errors on discovery, append `?replicaSet=rs0`.
- Keep `--ipv6 --bind_ip ::,0.0.0.0`; set up Railway volume backups before go-live.
