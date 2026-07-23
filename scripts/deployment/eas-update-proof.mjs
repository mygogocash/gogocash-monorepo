import {
  appendLines,
  failClosedMain,
  httpsUrl,
  readJsonFile,
  requiredEnv,
  safeScalar,
} from "./common.mjs";

function main() {
  const channel = requiredEnv("EAS_CHANNEL");
  const commitSha = requiredEnv("COMMIT_SHA");
  if (!/^[0-9a-f]{40}$/.test(commitSha)) {
    throw new Error(
      "Dispatched commit must be a full lowercase 40-character SHA.",
    );
  }
  const updates = readJsonFile(
    requiredEnv("EAS_UPDATE_JSON"),
    "EAS update response",
  );
  if (!Array.isArray(updates) || updates.length !== 2) {
    throw new Error(
      "EAS Update must return exactly one Android and one iOS record.",
    );
  }

  const proof = updates.map((update) => {
    if (!update || typeof update !== "object" || Array.isArray(update)) {
      throw new Error("EAS Update returned a malformed platform record.");
    }
    if (update.gitCommitHash !== commitSha) {
      throw new Error("Update commit does not match dispatched SHA.");
    }
    if (update.branch !== channel) {
      throw new Error("Update branch does not match staging.");
    }
    const platform = safeScalar(update.platform, "update platform");
    if (!new Set(["android", "ios"]).has(platform)) {
      throw new Error(`Unexpected update platform: ${platform}.`);
    }
    return {
      branch: update.branch,
      group: safeScalar(update.group, `${platform} update group`),
      id: safeScalar(update.id, `${platform} update ID`),
      manifestUrl: httpsUrl(
        update.manifestPermalink,
        `${platform} manifest permalink`,
      ),
      platform,
      runtimeVersion: safeScalar(
        update.runtimeVersion,
        `${platform} runtime version`,
      ),
    };
  });

  for (const platform of ["android", "ios"]) {
    if (proof.filter((update) => update.platform === platform).length !== 1) {
      throw new Error(
        `Staging OTA must return exactly one ${platform} update.`,
      );
    }
  }
  if (new Set(proof.map((update) => update.id)).size !== proof.length) {
    throw new Error("Staging OTA update IDs must be unique.");
  }
  if (new Set(proof.map((update) => update.group)).size !== 1) {
    throw new Error(
      "Staging OTA platform records must share one update group.",
    );
  }
  if (new Set(proof.map((update) => update.runtimeVersion)).size !== 1) {
    throw new Error(
      "Staging OTA platform records must share one runtime version.",
    );
  }

  const lines = [
    "### EAS staging OTA proof",
    "",
    `- Channel: \`${channel}\``,
    `- Branch: \`${channel}\``,
    `- Commit: \`${commitSha}\``,
  ];
  for (const update of proof) {
    lines.push(
      `- ${update.platform}: [${update.id}](${update.manifestUrl})`,
      `  - group: \`${update.group}\``,
      `  - runtime: \`${update.runtimeVersion}\``,
    );
  }
  appendLines(requiredEnv("GITHUB_STEP_SUMMARY"), lines);
}

failClosedMain(main);
