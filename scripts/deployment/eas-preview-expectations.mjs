import {
  closeSync,
  constants,
  openSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";

import { failClosedMain, requiredEnv } from "./common.mjs";

const EXPECTATIONS_FILE_NAME = "eas-preview-expectations.json";
const FIREBASE_EXPECTATION_ENV = {
  EXPO_PUBLIC_FIREBASE_API_KEY: "EXPECTED_FIREBASE_API_KEY",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "EXPECTED_FIREBASE_AUTH_DOMAIN",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "EXPECTED_FIREBASE_PROJECT_ID",
  EXPO_PUBLIC_FIREBASE_APP_ID: "EXPECTED_FIREBASE_APP_ID",
};

function main() {
  const requestedPath = process.argv[2];
  if (!requestedPath || !isAbsolute(requestedPath)) {
    throw new Error("The EAS expectations path must be absolute.");
  }
  const runnerTemp = realpathSync(requiredEnv("RUNNER_TEMP"));
  const outputPath = resolve(requestedPath);
  if (
    realpathSync(dirname(outputPath)) !== runnerTemp ||
    basename(outputPath) !== EXPECTATIONS_FILE_NAME
  ) {
    throw new Error("The EAS expectations file must stay in RUNNER_TEMP.");
  }

  const firebase = Object.fromEntries(
    Object.entries(FIREBASE_EXPECTATION_ENV).map(([remoteName, sourceName]) => [
      remoteName,
      requiredEnv(sourceName),
    ]),
  );

  let descriptor;
  try {
    descriptor = openSync(
      outputPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
  } catch {
    throw new Error("The EAS expectations file could not be created safely.");
  }
  try {
    writeFileSync(descriptor, JSON.stringify({ version: 1, firebase }), "utf8");
  } finally {
    closeSync(descriptor);
  }
}

failClosedMain(main);
