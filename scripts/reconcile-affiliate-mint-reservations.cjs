#!/usr/bin/env node
"use strict";

const { createHash, randomUUID } = require("node:crypto");
const { MongoClient } = require("mongodb");

const REPORT_SCHEMA = "gogocash.affiliate-mint-reconciliation.v1";
const RESERVATION_COLLECTION = "affiliate_mint_reservations";
const DEEPLINK_COLLECTION = "deeplinks";
const SENTINEL_COLLECTION = "environment_sentinels";
const SENTINEL_ID = "gogocash-affiliate-mint-reconciliation-v1";
const SENTINEL_PURPOSE = "affiliate-mint-reconciliation";
const DESTINATION_IDENTITY_INDEX = "affiliate_destination_identity_unique_v1";
const GENERAL_DESTINATION_SENTINEL =
  "gogocash:affiliate:general-destination:v1";
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;
const ALLOWED_ENVIRONMENTS = new Set(["dev", "staging"]);

class ReconciliationError extends Error {
  constructor(code, message, report) {
    super(message);
    this.name = "ReconciliationError";
    this.code = code;
    this.report = report;
  }
}

function requireEnvironment(value) {
  const environment = typeof value === "string" ? value.trim() : "";
  if (!ALLOWED_ENVIRONMENTS.has(environment)) {
    throw new ReconciliationError(
      "NONPRODUCTION_ENV_REQUIRED",
      "Reconciliation is restricted to the dev and staging environments.",
    );
  }
  return environment;
}

function normalizeMode(value) {
  const mode =
    typeof value === "string" && value.trim() ? value.trim() : "audit";
  if (mode !== "audit" && mode !== "apply") {
    throw new ReconciliationError(
      "INVALID_MODE",
      "Reconciliation mode must be audit or apply.",
    );
  }
  return mode;
}

function normalizeBatchSize(value) {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_BATCH_SIZE;
  }
  const size = Number(value);
  if (!Number.isInteger(size) || size < 1 || size > MAX_BATCH_SIZE) {
    throw new ReconciliationError(
      "INVALID_BATCH_SIZE",
      `Batch size must be an integer from 1 to ${MAX_BATCH_SIZE}.`,
    );
  }
  return size;
}

function expectedConfirmation(environment) {
  return `affiliate-mint-reconcile-${environment}`;
}

function opaqueId(value) {
  return createHash("sha256")
    .update(String(value), "utf8")
    .digest("hex")
    .slice(0, 16);
}

function canonicalHttpUrl(value, allowEmpty) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return allowEmpty ? "" : null;
  try {
    const url = new URL(trimmed);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      url.toString() !== trimmed
    ) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

function destinationIdentityHash(destination) {
  return createHash("sha256")
    .update(destination || GENERAL_DESTINATION_SENTINEL, "utf8")
    .digest("hex");
}

function reservationIdentityId(row) {
  return createHash("sha256")
    .update(
      [
        row.source,
        String(row.user_id),
        row.offer_id,
        row.merchant_id,
        row.destination_hash,
      ].join(":"),
      "utf8",
    )
    .digest("hex");
}

function cacheIdentityFilter(row) {
  return {
    source: row.source,
    user_id: row.user_id,
    offer_id: row.offer_id,
    merchant_id: row.merchant_id,
    destination_hash: row.destination_hash,
  };
}

function isExactDestinationIdentityIndex(index) {
  if (!index || index.name !== DESTINATION_IDENTITY_INDEX) return false;
  const expectedKeyEntries = [
    ["source", 1],
    ["user_id", 1],
    ["offer_id", 1],
    ["merchant_id", 1],
    ["destination_hash", 1],
  ];
  const actualKeyEntries = Object.entries(index.key ?? {});
  const exactKey =
    actualKeyEntries.length === expectedKeyEntries.length &&
    actualKeyEntries.every(
      ([field, direction], position) =>
        field === expectedKeyEntries[position][0] &&
        direction === expectedKeyEntries[position][1],
    );
  const partial = index.partialFilterExpression;
  const safePartial =
    partial === undefined ||
    (Object.keys(partial).length === 2 &&
      partial.source?.$type === "string" &&
      partial.destination_hash?.$type === "string");
  return index.unique === true && exactKey && safePartial;
}

function classifyReservation(row, cache) {
  const destination = canonicalHttpUrl(row?.destination_url, true);
  const tracked = canonicalHttpUrl(row?.tracked_deeplink, false);
  const structurallySafe =
    row?.status === "provider_succeeded" &&
    row?.source === "involve" &&
    row?.user_id &&
    Number.isFinite(row?.offer_id) &&
    Number.isFinite(row?.merchant_id) &&
    typeof row?.destination_hash === "string" &&
    row.destination_hash === destinationIdentityHash(destination ?? "") &&
    destination !== null &&
    tracked !== null &&
    String(row._id) === reservationIdentityId(row);
  if (!structurallySafe) return "mismatch";
  if (!cache) return "missing_cache";

  const cacheDestination = canonicalHttpUrl(cache.destination_url, true);
  const cacheTracked = canonicalHttpUrl(cache.deeplink, false);
  const exactCache =
    cache.source === row.source &&
    String(cache.user_id) === String(row.user_id) &&
    cache.offer_id === row.offer_id &&
    cache.merchant_id === row.merchant_id &&
    cache.destination_hash === row.destination_hash &&
    cacheDestination === destination &&
    cacheTracked === tracked;
  return exactCache ? "candidate" : "mismatch";
}

function createReport({
  environment,
  mode,
  now,
  batchSize,
  truncated,
  uncertainCount,
  uncertainRows,
  destinationIdentityIndexReady,
  candidates,
  missing,
  mismatches,
}) {
  return {
    schema: REPORT_SCHEMA,
    runId: randomUUID(),
    completedAt: now.toISOString(),
    environment,
    mode,
    batchSize,
    truncated,
    safety: {
      destinationIdentityIndexReady,
    },
    counts: {
      scanned: candidates.length + missing.length + mismatches.length,
      candidates: candidates.length,
      missingCache: missing.length,
      mismatchedCache: mismatches.length,
      providerStartedUncertain: uncertainCount,
      changed: 0,
      racedOrAlreadyReconciled: 0,
    },
    opaqueIds: {
      candidates: candidates.map((row) => opaqueId(row._id)),
      missingCache: missing.map((row) => opaqueId(row._id)),
      mismatchedCache: mismatches.map((row) => opaqueId(row._id)),
      providerStartedUncertain: uncertainRows.map((row) => opaqueId(row._id)),
    },
  };
}

async function assertApplySentinel(db, environment, confirmation) {
  if (confirmation !== expectedConfirmation(environment)) {
    throw new ReconciliationError(
      "CONFIRMATION_REQUIRED",
      `Write mode requires CONFIRM_NONPROD_WRITE=${expectedConfirmation(environment)}.`,
    );
  }
  const sentinel = await db.collection(SENTINEL_COLLECTION).findOne({
    _id: SENTINEL_ID,
  });
  if (
    !sentinel ||
    sentinel.environment !== environment ||
    sentinel.purpose !== SENTINEL_PURPOSE ||
    sentinel.write_enabled !== true
  ) {
    throw new ReconciliationError(
      "SENTINEL_REQUIRED",
      "The exact nonproduction reconciliation sentinel is missing or invalid.",
    );
  }
}

async function reconcileAffiliateMintReservations({
  db,
  environment: requestedEnvironment,
  mode: requestedMode,
  confirmation,
  batchSize: requestedBatchSize,
  now = new Date(),
}) {
  const environment = requireEnvironment(requestedEnvironment);
  const mode = normalizeMode(requestedMode);
  const batchSize = normalizeBatchSize(requestedBatchSize);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new ReconciliationError(
      "INVALID_TIME",
      "Reconciliation time is invalid.",
    );
  }
  if (mode === "apply") {
    await assertApplySentinel(db, environment, confirmation);
  }

  const reservations = db.collection(RESERVATION_COLLECTION);
  const deeplinks = db.collection(DEEPLINK_COLLECTION);
  const destinationIdentityIndexReady = (await deeplinks.indexes()).some(
    isExactDestinationIdentityIndex,
  );
  const rows = await reservations
    .find({ status: "provider_succeeded" })
    .sort({ _id: 1 })
    .limit(batchSize + 1)
    .toArray();
  const truncated = rows.length > batchSize;
  const batch = rows.slice(0, batchSize);
  const candidates = [];
  const missing = [];
  const mismatches = [];

  for (const row of batch) {
    const caches = await deeplinks
      .find(cacheIdentityFilter(row))
      .sort({ _id: 1 })
      .limit(2)
      .toArray();
    const classification =
      caches.length > 1
        ? "mismatch"
        : classifyReservation(row, caches[0] ?? null);
    if (classification === "candidate") candidates.push(row);
    else if (classification === "missing_cache") missing.push(row);
    else mismatches.push(row);
  }
  const [uncertainCount, uncertainRows] = await Promise.all([
    reservations.countDocuments({ status: "provider_started" }),
    reservations
      .find({ status: "provider_started" })
      .sort({ _id: 1 })
      .limit(batchSize)
      .toArray(),
  ]);
  const report = createReport({
    environment,
    mode,
    now,
    batchSize,
    truncated,
    uncertainCount,
    uncertainRows,
    destinationIdentityIndexReady,
    candidates,
    missing,
    mismatches,
  });

  if (mode === "audit") return report;
  if (!destinationIdentityIndexReady) {
    throw new ReconciliationError(
      "DESTINATION_INDEX_REQUIRED",
      "Write mode requires the exact unique destination identity index.",
      report,
    );
  }
  if (mismatches.length > 0) {
    throw new ReconciliationError(
      "CACHE_MISMATCH",
      "Write mode refused a provider result whose durable cache identity did not match.",
      report,
    );
  }

  for (const row of candidates) {
    const result = await reservations.updateOne(
      {
        _id: row._id,
        status: "provider_succeeded",
        source: row.source,
        user_id: row.user_id,
        offer_id: row.offer_id,
        merchant_id: row.merchant_id,
        destination_hash: row.destination_hash,
        destination_url: row.destination_url,
        tracked_deeplink: row.tracked_deeplink,
      },
      {
        $set: {
          status: "committed",
          committed_at: now,
          updated_at: now,
          expires_at: new Date(now.getTime() + RETENTION_MS),
        },
      },
    );
    if (result.matchedCount === 1) report.counts.changed += 1;
    else report.counts.racedOrAlreadyReconciled += 1;
  }
  return report;
}

function requiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ReconciliationError("CONFIG_REQUIRED", `${name} is required.`);
  }
  return value;
}

async function cli() {
  const mongoUri = requiredEnvironmentVariable("MONGO_URI");
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const report = await reconcileAffiliateMintReservations({
      db: client.db(),
      environment: requiredEnvironmentVariable("QA_ENV"),
      mode: process.env.RECONCILIATION_MODE,
      confirmation: process.env.CONFIRM_NONPROD_WRITE,
      batchSize: process.env.RECONCILIATION_BATCH_SIZE,
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await client.close();
  }
}

module.exports = {
  DEFAULT_BATCH_SIZE,
  DESTINATION_IDENTITY_INDEX,
  REPORT_SCHEMA,
  RETENTION_MS,
  SENTINEL_ID,
  SENTINEL_PURPOSE,
  ReconciliationError,
  classifyReservation,
  destinationIdentityHash,
  expectedConfirmation,
  isExactDestinationIdentityIndex,
  normalizeMode,
  opaqueId,
  reconcileAffiliateMintReservations,
  reservationIdentityId,
};

if (require.main === module) {
  cli().catch((error) => {
    const safe = {
      schema: REPORT_SCHEMA,
      ok: false,
      code:
        error instanceof ReconciliationError
          ? error.code
          : "RECONCILIATION_FAILED",
      message:
        error instanceof ReconciliationError
          ? error.message
          : "Affiliate mint reconciliation failed.",
      ...(error instanceof ReconciliationError && error.report
        ? { report: error.report }
        : {}),
    };
    process.stderr.write(`${JSON.stringify(safe)}\n`);
    process.exitCode = 1;
  });
}
