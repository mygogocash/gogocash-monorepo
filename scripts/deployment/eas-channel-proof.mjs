import {
  appendLine,
  failClosedMain,
  readJsonFile,
  requiredEnv,
} from "./common.mjs";

function main() {
  const expectedChannel = requiredEnv("EAS_CHANNEL");
  const payload = readJsonFile(
    requiredEnv("EAS_CHANNEL_JSON"),
    "EAS channel response",
  );
  const channel = payload.currentPage;
  if (!channel || channel.name !== expectedChannel) {
    throw new Error("EAS channel lookup did not return the staging channel.");
  }
  if (channel.isPaused !== false) {
    throw new Error(
      "The staging EAS channel must exist and be active before publishing.",
    );
  }
  if (
    !Array.isArray(channel.updateBranches) ||
    channel.updateBranches.length !== 1 ||
    channel.updateBranches[0]?.name !== expectedChannel
  ) {
    throw new Error(
      "The staging EAS channel must map to exactly one staging branch.",
    );
  }
  appendLine(
    requiredEnv("GITHUB_STEP_SUMMARY"),
    `EAS target proof: channel \`${expectedChannel}\` maps only to active branch \`${expectedChannel}\`.`,
  );
}

failClosedMain(main);
