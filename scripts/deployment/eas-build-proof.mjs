import {
  appendLines,
  failClosedMain,
  httpsUrl,
  readJsonFile,
  requiredEnv,
  safeScalar,
} from "./common.mjs";

function main() {
  const parsed = readJsonFile(
    requiredEnv("EAS_BUILD_JSON"),
    "EAS build response",
  );
  const builds = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.builds)
      ? parsed.builds
      : [parsed];
  const channel = requiredEnv("EAS_CHANNEL");
  const commitSha = requiredEnv("COMMIT_SHA");
  const profile = requiredEnv("EAS_PROFILE");
  const projectId = safeScalar(
    requiredEnv("EXPO_PUBLIC_EAS_PROJECT_ID"),
    "EAS project ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  if (!/^[0-9a-f]{40}$/.test(commitSha)) {
    throw new Error(
      "Dispatched commit must be a full lowercase 40-character SHA.",
    );
  }
  const selectedPlatform = requiredEnv("EAS_PLATFORM");
  const expectedPlatforms =
    selectedPlatform === "all" ? ["android", "ios"] : [selectedPlatform];
  if (
    expectedPlatforms.some(
      (platform) => !new Set(["android", "ios"]).has(platform),
    ) ||
    builds.length !== expectedPlatforms.length
  ) {
    throw new Error(
      "EAS build result does not match the selected platform set.",
    );
  }

  const proof = expectedPlatforms.map((platform) => {
    const matches = builds.filter(
      (build) => String(build.platform || "").toLowerCase() === platform,
    );
    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one ${platform} build, got ${matches.length}.`,
      );
    }
    const build = matches[0];
    if (build.status !== "FINISHED") {
      throw new Error(`${platform} build is not terminal-successful.`);
    }
    if (build.gitCommitHash !== commitSha) {
      throw new Error(
        `${platform} build commit does not match dispatched SHA.`,
      );
    }
    if (build.buildProfile !== profile) {
      throw new Error(`${platform} build profile does not match preview.`);
    }
    if (build.channel !== channel) {
      throw new Error(`${platform} build channel does not match staging.`);
    }
    if (build.distribution !== "INTERNAL") {
      throw new Error(
        `${platform} build is not an internal-distribution artifact.`,
      );
    }
    if (build.project?.id !== projectId) {
      throw new Error(
        `${platform} build belongs to an unexpected EAS project.`,
      );
    }

    const id = safeScalar(build.id, `${platform} build ID`);
    const accountName = safeScalar(
      build.project?.ownerAccount?.name,
      `${platform} EAS account name`,
    );
    const projectSlug = safeScalar(
      build.project?.slug,
      `${platform} EAS project slug`,
    );
    const runtimeVersion = safeScalar(
      build.runtimeVersion,
      `${platform} runtime version`,
    );
    const detailsUrl = new URL(
      `/accounts/${encodeURIComponent(accountName)}/projects/${encodeURIComponent(projectSlug)}/builds/${encodeURIComponent(id)}`,
      "https://expo.dev",
    ).href;
    const artifactUrl = httpsUrl(
      build.artifacts?.applicationArchiveUrl ||
        build.artifacts?.buildUrl ||
        build.artifacts?.apkUrl ||
        build.buildUrl,
      `${platform} artifact URL`,
    );
    return { artifactUrl, detailsUrl, id, platform, runtimeVersion };
  });

  const android = proof.find((build) => build.platform === "android");
  if (android) {
    appendLines(requiredEnv("GITHUB_ENV"), [
      `EAS_BUILD_ID=${android.id}`,
      `EAS_BUILD_ARTIFACT_URL=${android.artifactUrl}`,
    ]);
  }

  const lines = ["### EAS preview build proof", ""];
  for (const build of proof) {
    lines.push(
      `- ${build.platform}: [${build.id}](${build.detailsUrl})`,
      `  - artifact: [HTTPS archive](${build.artifactUrl})`,
      `  - commit: \`${commitSha}\``,
      `  - profile / channel: \`${profile}\` / \`${channel}\``,
      "  - distribution: `internal`",
      `  - runtime: \`${build.runtimeVersion}\``,
    );
  }
  appendLines(requiredEnv("GITHUB_STEP_SUMMARY"), lines);
}

failClosedMain(main);
