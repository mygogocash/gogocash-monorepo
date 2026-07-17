import { lstatSync } from "node:fs";
import { isAbsolute } from "node:path";

import {
  appendLine,
  failClosedMain,
  readJsonFile,
  requiredEnv,
} from "./common.mjs";

const REQUIRED_FIREBASE_VARIABLES = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
];

const EXPECTED_STAGING_IDENTITY = {
  EXPO_PUBLIC_EAS_PROJECT_ID: "0039c25f-f88e-491d-8da9-85b8d6e66558",
  EXPO_PUBLIC_API_URL: "https://api-staging.gogocash.co",
  EXPO_PUBLIC_APP_ENV: "staging",
  EXPO_PUBLIC_ACCOUNT_DATA_SOURCE: "backend",
  EXPO_PUBLIC_FRONTEND_URL: "https://app-staging.gogocash.co",
};

function firebaseExpectations() {
  const path = process.argv[2];
  if (!path || !isAbsolute(path)) {
    throw new Error("The EAS expectations path must be absolute.");
  }
  let stats;
  try {
    stats = lstatSync(path);
  } catch {
    throw new Error("The EAS expectations file could not be read safely.");
  }
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.size < 1 ||
    stats.size > 65_536 ||
    (stats.mode & 0o077) !== 0 ||
    (typeof process.getuid === "function" && stats.uid !== process.getuid())
  ) {
    throw new Error("The EAS expectations file is not a trusted private file.");
  }

  const payload = readJsonFile(path, "EAS expectations file");
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.keys(payload).sort().join(",") !== "firebase,version" ||
    payload.version !== 1 ||
    !payload.firebase ||
    typeof payload.firebase !== "object" ||
    Array.isArray(payload.firebase) ||
    Object.keys(payload.firebase).sort().join(",") !==
      [...REQUIRED_FIREBASE_VARIABLES].sort().join(",")
  ) {
    throw new Error("The EAS expectations file has an invalid contract.");
  }
  return Object.fromEntries(
    REQUIRED_FIREBASE_VARIABLES.map((name) => {
      const value = payload.firebase[name];
      if (typeof value !== "string" || !value.trim()) {
        throw new Error("The EAS expectations file has a blank value.");
      }
      return [name, value.trim()];
    }),
  );
}

function main() {
  const expectations = firebaseExpectations();
  for (const remoteName of REQUIRED_FIREBASE_VARIABLES) {
    if (requiredEnv(remoteName) !== expectations[remoteName]) {
      throw new Error(
        `${remoteName} does not match the canonical GitHub staging secret.`,
      );
    }
  }
  for (const [name, expected] of Object.entries(EXPECTED_STAGING_IDENTITY)) {
    if (requiredEnv(name) !== expected) {
      throw new Error(`${name} does not match the fixed staging target.`);
    }
  }
  appendLine(
    requiredEnv("GITHUB_STEP_SUMMARY"),
    "EAS preview environment proof: Firebase matches the canonical GitHub staging secrets and the release target is fixed to staging.",
  );
}

failClosedMain(main);
