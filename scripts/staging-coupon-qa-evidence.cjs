#!/usr/bin/env node
"use strict";

const { createHash, createHmac, timingSafeEqual } = require("node:crypto");
const { chmodSync, readFileSync, writeFileSync } = require("node:fs");

const EVIDENCE_SCHEMA = "gogocash.issue339.dev-evidence.v2";
const REVISION_SCHEMA = "gogocash.deployment-revision.v1";
const DEV_API_URL = "https://api.dev.gogocash.co";
const MAX_EVIDENCE_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

class CouponQaEvidenceError extends Error {
  constructor(message) {
    super(message);
    this.name = "CouponQaEvidenceError";
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new CouponQaEvidenceError(`${label} is missing`);
  }
  return value;
}

function requireSha(value, label) {
  const normalized = requireString(value, label).toLowerCase();
  if (!SHA_PATTERN.test(normalized)) {
    throw new CouponQaEvidenceError(`${label} is not a full Git revision`);
  }
  return normalized;
}

function requireDigest(value, label) {
  const normalized = requireString(value, label).toLowerCase();
  if (!DIGEST_PATTERN.test(normalized)) {
    throw new CouponQaEvidenceError(`${label} is not a SHA-256 digest`);
  }
  return normalized;
}

function requireHmacKey(value) {
  const key = requireString(value, "QA evidence HMAC key");
  if (Buffer.byteLength(key, "utf8") < 32) {
    throw new CouponQaEvidenceError(
      "QA evidence HMAC key must contain at least 32 bytes",
    );
  }
  return key;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function signaturePayload(evidence) {
  const { signature: _signature, ...unsigned } = evidence;
  return canonicalJson(unsigned);
}

function signEvidence(evidence, hmacKey) {
  return createHmac("sha256", requireHmacKey(hmacKey))
    .update(signaturePayload(evidence))
    .digest("hex");
}

function parseJsonFile(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new CouponQaEvidenceError(`${label} is not valid JSON`);
  }
}

function parseDeploymentProof(raw, { expectedEnvironment, expectedRevision }) {
  const proof = typeof raw === "string" ? JSON.parse(raw) : raw;
  const revision = requireSha(proof?.revision, "deployed revision");
  if (
    proof?.schema !== REVISION_SCHEMA ||
    proof?.environment !== expectedEnvironment ||
    revision !== requireSha(expectedRevision, "expected revision")
  ) {
    throw new CouponQaEvidenceError(
      "deployed revision proof does not match the requested environment and revision",
    );
  }
  return { ...proof, revision };
}

function buildEvidence({
  hmacKey,
  runId,
  deployedRevision,
  localRevision,
  qaScriptPath,
  mongoHelperPath,
  evidenceHelperPath,
  cleanup,
  completedAt = new Date(),
  lifetimeMs = MAX_EVIDENCE_AGE_MS,
}) {
  if (
    cleanup?.couponCount !== 0 ||
    cleanup?.offerCount !== 0 ||
    cleanup?.skipped === true
  ) {
    throw new CouponQaEvidenceError(
      "cleanup proof must show exact absence of every fixture",
    );
  }
  const completed = new Date(completedAt);
  if (!Number.isFinite(completed.getTime())) {
    throw new CouponQaEvidenceError("completion time is invalid");
  }
  if (!(lifetimeMs > 0 && lifetimeMs <= MAX_EVIDENCE_AGE_MS)) {
    throw new CouponQaEvidenceError("evidence lifetime is invalid");
  }
  const evidence = {
    schema: EVIDENCE_SCHEMA,
    issue: 339,
    qaEnvironment: "dev",
    apiUrl: DEV_API_URL,
    environmentIdentity: "dev",
    deployedRevision: requireSha(deployedRevision, "deployed revision"),
    localRevision: requireSha(localRevision, "local revision"),
    artifacts: {
      qaScriptSha256: sha256File(qaScriptPath),
      mongoHelperSha256: sha256File(mongoHelperPath),
      evidenceHelperSha256: sha256File(evidenceHelperPath),
    },
    runId: requireString(runId, "run id"),
    completedAt: completed.toISOString(),
    expiresAt: new Date(completed.getTime() + lifetimeMs).toISOString(),
    publicContractVerified: true,
    cleanup: {
      verified: true,
      couponCount: 0,
      offerCount: 0,
    },
  };
  if (evidence.deployedRevision !== evidence.localRevision) {
    throw new CouponQaEvidenceError(
      "deployed and local revisions must match before evidence is created",
    );
  }
  return { ...evidence, signature: signEvidence(evidence, hmacKey) };
}

function writeEvidence(path, evidence) {
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(path, 0o600);
}

function verifyEvidence(
  evidence,
  {
    hmacKey,
    expectedRevision,
    qaScriptPath,
    mongoHelperPath,
    evidenceHelperPath,
    now = new Date(),
  },
) {
  const expectedSignature = signEvidence(evidence, hmacKey);
  const actualSignature = requireDigest(
    evidence?.signature,
    "evidence signature",
  );
  if (
    !timingSafeEqual(
      Buffer.from(actualSignature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    )
  ) {
    throw new CouponQaEvidenceError("evidence signature is invalid");
  }

  const revision = requireSha(expectedRevision, "expected revision");
  const completedAt = new Date(evidence?.completedAt).getTime();
  const expiresAt = new Date(evidence?.expiresAt).getTime();
  const nowMs = new Date(now).getTime();
  if (
    !Number.isFinite(completedAt) ||
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(nowMs) ||
    completedAt > nowMs + MAX_CLOCK_SKEW_MS ||
    expiresAt <= completedAt ||
    expiresAt <= nowMs ||
    expiresAt - completedAt > MAX_EVIDENCE_AGE_MS
  ) {
    throw new CouponQaEvidenceError("evidence is stale or has invalid timing");
  }

  const expectedArtifacts = {
    qaScriptSha256: sha256File(qaScriptPath),
    mongoHelperSha256: sha256File(mongoHelperPath),
    evidenceHelperSha256: sha256File(evidenceHelperPath),
  };
  if (
    evidence?.schema !== EVIDENCE_SCHEMA ||
    evidence?.issue !== 339 ||
    evidence?.qaEnvironment !== "dev" ||
    evidence?.apiUrl !== DEV_API_URL ||
    evidence?.environmentIdentity !== "dev" ||
    evidence?.deployedRevision !== revision ||
    evidence?.localRevision !== revision ||
    evidence?.publicContractVerified !== true ||
    evidence?.cleanup?.verified !== true ||
    evidence?.cleanup?.couponCount !== 0 ||
    evidence?.cleanup?.offerCount !== 0 ||
    canonicalJson(evidence?.artifacts) !== canonicalJson(expectedArtifacts)
  ) {
    throw new CouponQaEvidenceError(
      "evidence does not match the current revision, QA artifacts, or dev contract",
    );
  }
  return evidence;
}

function requiredEnvironment(name) {
  return requireString(process.env[name], name);
}

function cli() {
  const command = process.argv[2];
  if (command === "revision") {
    const proof = parseDeploymentProof(
      parseJsonFile(
        requiredEnvironment("QA_REVISION_RESPONSE_FILE"),
        "revision proof",
      ),
      {
        expectedEnvironment: requiredEnvironment("QA_ENV"),
        expectedRevision: requiredEnvironment("EXPECTED_REVISION"),
      },
    );
    process.stdout.write(`${proof.revision}\n`);
    return;
  }

  const shared = {
    hmacKey: requiredEnvironment("QA_EVIDENCE_HMAC_KEY"),
    qaScriptPath: requiredEnvironment("QA_SCRIPT_PATH"),
    mongoHelperPath: requiredEnvironment("QA_MONGO_HELPER_PATH"),
    evidenceHelperPath: requiredEnvironment("QA_EVIDENCE_HELPER_PATH"),
  };
  if (command === "create") {
    const cleanup = parseJsonFile(
      requiredEnvironment("QA_CLEANUP_RESULT_FILE"),
      "cleanup proof",
    );
    const evidence = buildEvidence({
      ...shared,
      runId: requiredEnvironment("QA_RUN_ID"),
      deployedRevision: requiredEnvironment("DEPLOYED_REVISION"),
      localRevision: requiredEnvironment("EXPECTED_REVISION"),
      cleanup,
    });
    writeEvidence(requiredEnvironment("QA_EVIDENCE_OUTPUT_FILE"), evidence);
    return;
  }
  if (command === "verify") {
    verifyEvidence(
      parseJsonFile(requiredEnvironment("DEV_EVIDENCE_FILE"), "dev evidence"),
      {
        ...shared,
        expectedRevision: requiredEnvironment("EXPECTED_REVISION"),
      },
    );
    return;
  }
  throw new CouponQaEvidenceError("unknown QA evidence command");
}

module.exports = {
  CouponQaEvidenceError,
  DEV_API_URL,
  EVIDENCE_SCHEMA,
  MAX_EVIDENCE_AGE_MS,
  REVISION_SCHEMA,
  buildEvidence,
  canonicalJson,
  parseDeploymentProof,
  sha256File,
  signEvidence,
  verifyEvidence,
  writeEvidence,
};

if (require.main === module) {
  try {
    cli();
  } catch (error) {
    const detail =
      error instanceof CouponQaEvidenceError ? ` ${error.message}.` : "";
    process.stderr.write(`[FAIL] Coupon QA evidence check failed.${detail}\n`);
    process.exitCode = 1;
  }
}
