import { appendLine, failClosedMain, requiredEnv } from "./common.mjs";

function main() {
  const action = requiredEnv("SELECTED_ACTION");
  const platform = requiredEnv("SELECTED_PLATFORM");
  if (!new Set(["build", "update"]).has(action)) {
    throw new Error("Unsupported staging EAS action.");
  }
  if (!new Set(["all", "android", "ios"]).has(platform)) {
    throw new Error("Unsupported staging EAS platform.");
  }
  const eventName = requiredEnv("GITHUB_EVENT_NAME");
  if (eventName === "workflow_dispatch") {
    if (action === "update" && platform !== "all") {
      throw new Error("Manual staging OTA must target all platforms.");
    }
  } else if (eventName === "push") {
    if (action !== "update" || platform !== "all") {
      throw new Error(
        "The ci-staging caller may publish only an all-platform OTA update.",
      );
    }
  } else {
    throw new Error("Unsupported staging EAS event.");
  }
  if (
    requiredEnv("EAS_CHANNEL") !== "staging" ||
    requiredEnv("EAS_PROFILE") !== "preview" ||
    requiredEnv("EAS_ENVIRONMENT") !== "preview"
  ) {
    throw new Error("EAS staging target configuration is not fixed correctly.");
  }
  for (const name of [
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_APP_ID",
  ]) {
    requiredEnv(name);
  }
  appendLine(
    requiredEnv("GITHUB_STEP_SUMMARY"),
    "EAS staging environment proof: all four required Firebase variables are present.",
  );
}

failClosedMain(main);
