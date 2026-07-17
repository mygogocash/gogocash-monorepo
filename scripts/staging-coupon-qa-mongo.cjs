#!/usr/bin/env node
"use strict";

const { readFileSync, writeFileSync } = require("node:fs");
const { MongoClient, ObjectId } = require("mongodb");

const SENTINEL_COLLECTION = "environment_sentinels";
const SENTINEL_ID = "gogocash-issue-339-coupon-qa-v1";
const SENTINEL_PURPOSE = "issue-339-coupon-contract-qa";
const FIXTURE_SOURCE = "qa-issue-339";
const ALLOWED_ENVIRONMENTS = new Set(["dev", "staging"]);

class CouponQaSafetyError extends Error {
  constructor(message) {
    super(message);
    this.name = "CouponQaSafetyError";
  }
}

function requireAllowedEnvironment(qaEnv) {
  if (!ALLOWED_ENVIRONMENTS.has(qaEnv)) {
    throw new CouponQaSafetyError("QA environment is not permitted");
  }
}

async function assertEnvironmentSentinel(db, qaEnv) {
  requireAllowedEnvironment(qaEnv);
  const sentinel = await db.collection(SENTINEL_COLLECTION).findOne({
    _id: SENTINEL_ID,
  });
  if (
    !sentinel ||
    sentinel.environment !== qaEnv ||
    sentinel.purpose !== SENTINEL_PURPOSE ||
    sentinel.write_enabled !== true
  ) {
    throw new CouponQaSafetyError(
      "Database environment sentinel is missing or does not match QA_ENV",
    );
  }
  return sentinel;
}

function buildFixtureState({ marker, qaEnv, now = new Date() }) {
  requireAllowedEnvironment(qaEnv);
  if (typeof marker !== "string" || !marker.startsWith(`QA #339 ${qaEnv} `)) {
    throw new CouponQaSafetyError("Fixture marker does not match QA_ENV");
  }
  const offerId = new ObjectId();
  const visibleCodeId = new ObjectId();
  const linkOnlyId = new ObjectId();
  return {
    version: 1,
    qaEnv,
    marker,
    offerId: offerId.toHexString(),
    couponIds: [visibleCodeId.toHexString(), linkOnlyId.toHexString()],
    destination: `https://example.com/qa-339/${offerId.toHexString()}?tracked=1`,
    preparedAt: now.toISOString(),
  };
}

function parseFixtureState(raw, { expectedMarker, qaEnv }) {
  let state;
  try {
    state = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new CouponQaSafetyError("Fixture state is invalid");
  }
  if (
    !state ||
    state.version !== 1 ||
    state.qaEnv !== qaEnv ||
    state.marker !== expectedMarker ||
    !ObjectId.isValid(state.offerId) ||
    !Array.isArray(state.couponIds) ||
    state.couponIds.length !== 2 ||
    !state.couponIds.every((id) => ObjectId.isValid(id))
  ) {
    throw new CouponQaSafetyError("Fixture state ownership is invalid");
  }
  return state;
}

function persistFixtureState(stateFile, state) {
  // This must happen before the first fixture insert so the EXIT cleanup can
  // recover an offer-only or coupon-partial failure by exact generated IDs.
  writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
}

function fixtureDocuments(state, now = new Date()) {
  const offerId = new ObjectId(state.offerId);
  const couponIds = state.couponIds.map((id) => new ObjectId(id));
  const start = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  const end = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  return {
    offer: {
      _id: offerId,
      qa_marker: state.marker,
      source: FIXTURE_SOURCE,
      offer_id: Number(`93${String(now.getTime()).slice(-8)}`),
      merchant_id: Number(`94${String(now.getTime()).slice(-8)}`),
      offer_name: state.marker,
      offer_name_display: state.marker,
      lookup_value: state.marker,
      tracking_link: state.destination,
      disabled: false,
      status: "approved",
      createdAt: now,
      updatedAt: now,
    },
    coupons: [
      {
        _id: couponIds[0],
        qa_marker: state.marker,
        offer_id: offerId,
        name: `${state.marker} visible-code`,
        code: `QA339-${String(now.getTime()).slice(-6)}`,
        code_enabled: true,
        discount: 10,
        discount_type: "percent",
        start_date: start,
        end_date: end,
        unlimited_amount_enabled: true,
        quantity: 0,
        terms_and_conditions: `${state.marker} visible terms`,
        disabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: couponIds[1],
        qa_marker: state.marker,
        offer_id: offerId,
        name: `${state.marker} link-only`,
        code: "",
        code_enabled: false,
        discount: 25,
        discount_type: "cash",
        discount_currency: "THB",
        max_cap: 100,
        max_cap_enabled: true,
        max_cap_currency: "THB",
        eligibility: "all users",
        one_time_use_enabled: false,
        usage_per_user: 3,
        start_date: start,
        end_date: end,
        unlimited_amount_enabled: false,
        quantity: 10,
        quantity_used: 0,
        terms_and_conditions: `${state.marker} link-only terms`,
        disabled: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

async function withDatabase(mongoUri, action) {
  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 15_000,
  });
  try {
    await client.connect();
    return await action(client.db());
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function checkSentinel({ mongoUri, qaEnv }) {
  return withDatabase(mongoUri, (db) => assertEnvironmentSentinel(db, qaEnv));
}

async function prepareFixtures({
  mongoUri,
  qaEnv,
  marker,
  stateFile,
  now = new Date(),
  afterOfferInsert,
}) {
  return withDatabase(mongoUri, async (db) => {
    await assertEnvironmentSentinel(db, qaEnv);
    const state = buildFixtureState({ marker, qaEnv, now });
    persistFixtureState(stateFile, state);
    const docs = fixtureDocuments(state, now);
    await db.collection("offers").insertOne(docs.offer);
    if (afterOfferInsert) await afterOfferInsert(state);
    await db.collection("coupons").insertMany(docs.coupons, { ordered: true });
    return state;
  });
}

function sameObjectId(value, expected) {
  return value instanceof ObjectId && value.equals(expected);
}

async function validateFixtureOwnership(db, state) {
  const offerId = new ObjectId(state.offerId);
  const couponIds = state.couponIds.map((id) => new ObjectId(id));
  const [offer, coupons] = await Promise.all([
    db.collection("offers").findOne({ _id: offerId }),
    db
      .collection("coupons")
      .find({ _id: { $in: couponIds } })
      .toArray(),
  ]);
  if (
    offer &&
    (offer.source !== FIXTURE_SOURCE ||
      offer.lookup_value !== state.marker ||
      offer.qa_marker !== state.marker)
  ) {
    throw new CouponQaSafetyError(
      "Fixture ownership drift detected; cleanup refused",
    );
  }
  for (const coupon of coupons) {
    if (
      coupon.qa_marker !== state.marker ||
      !sameObjectId(coupon.offer_id, offerId)
    ) {
      throw new CouponQaSafetyError(
        "Fixture ownership drift detected; cleanup refused",
      );
    }
  }
  return { offerId, couponIds };
}

async function cleanupFixtureState({ db, state, qaEnv, expectedMarker }) {
  await assertEnvironmentSentinel(db, qaEnv);
  const parsed = parseFixtureState(state, { expectedMarker, qaEnv });
  const { offerId, couponIds } = await validateFixtureOwnership(db, parsed);

  // Validate every existing exact-ID document before deleting anything. Once
  // ownership is proven, coupons go first so no fixture references a deleted
  // offer, then the offer is removed.
  await db.collection("coupons").deleteMany({
    _id: { $in: couponIds },
    offer_id: offerId,
    qa_marker: parsed.marker,
  });
  await db.collection("offers").deleteOne({
    _id: offerId,
    source: FIXTURE_SOURCE,
    lookup_value: parsed.marker,
    qa_marker: parsed.marker,
  });

  const [couponCount, offerCount] = await Promise.all([
    db.collection("coupons").countDocuments({ _id: { $in: couponIds } }),
    db.collection("offers").countDocuments({ _id: offerId }),
  ]);
  if (couponCount !== 0 || offerCount !== 0) {
    throw new CouponQaSafetyError(
      "Fixture cleanup exact-ID final-absence check failed",
    );
  }
  return { couponCount, offerCount };
}

async function cleanupFixtures({ mongoUri, qaEnv, marker, stateFile }) {
  let raw;
  try {
    raw = readFileSync(stateFile, "utf8");
  } catch {
    return { skipped: true };
  }
  if (!raw.trim()) return { skipped: true };
  return withDatabase(mongoUri, (db) =>
    cleanupFixtureState({
      db,
      state: raw,
      qaEnv,
      expectedMarker: marker,
    }),
  );
}

module.exports = {
  CouponQaSafetyError,
  FIXTURE_SOURCE,
  SENTINEL_COLLECTION,
  SENTINEL_ID,
  SENTINEL_PURPOSE,
  assertEnvironmentSentinel,
  buildFixtureState,
  checkSentinel,
  cleanupFixtureState,
  cleanupFixtures,
  fixtureDocuments,
  parseFixtureState,
  persistFixtureState,
  prepareFixtures,
};

if (require.main === module) {
  const command = process.argv[2];
  const options = {
    mongoUri: process.env.MONGO_URI,
    qaEnv: process.env.QA_ENV,
    marker: process.env.QA_MARKER,
    stateFile: process.env.QA_STATE_FILE,
  };
  const run =
    command === "sentinel"
      ? checkSentinel(options)
      : command === "prepare"
        ? prepareFixtures(options)
        : command === "cleanup"
          ? cleanupFixtures(options)
          : Promise.reject(
              new CouponQaSafetyError("Unknown QA database command"),
            );
  run
    .then((result) => {
      if (command === "cleanup") {
        process.stdout.write(`${JSON.stringify(result)}\n`);
      }
    })
    .catch((error) => {
      const detail =
        error instanceof CouponQaSafetyError ? ` ${error.message}.` : "";
      process.stderr.write(
        `[FAIL] Coupon QA database safety step failed.${detail}\n`,
      );
      process.exitCode = 1;
    });
}
