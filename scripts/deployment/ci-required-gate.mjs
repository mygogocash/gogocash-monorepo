import { failClosedMain, requiredEnv } from "./common.mjs";

const REQUIRED_NEEDS = [
  "changes",
  "admin",
  "app",
  "api-lint",
  "api-test",
  "api-build-smoke",
  "e2e-root",
  "gototrack",
  "gototrack-mcp",
  "knip",
  "workflow-contract",
];

function main() {
  let needs;
  try {
    needs = JSON.parse(requiredEnv("NEEDS_JSON", { trim: false }));
  } catch {
    throw new Error("Required CI dependency results are not valid JSON.");
  }
  if (!needs || typeof needs !== "object" || Array.isArray(needs)) {
    throw new Error("Required CI dependency results are not an object.");
  }

  const actualKeys = Object.keys(needs).sort();
  const expectedKeys = [...REQUIRED_NEEDS].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error("Required CI dependency set is incomplete or unexpected.");
  }

  const failures = [];
  for (const job of REQUIRED_NEEDS) {
    const result = needs[job]?.result;
    const allowed = job === "changes" ? ["success"] : ["success", "skipped"];
    if (!allowed.includes(result)) failures.push(`${job}: ${String(result)}`);
  }
  if (failures.length) {
    throw new Error(
      `Required CI dependencies did not pass: ${failures.join(", ")}.`,
    );
  }

  console.log("Required CI dependency results passed.");
}

failClosedMain(main);
