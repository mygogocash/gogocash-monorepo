import {
  appendLine,
  appendLines,
  failClosedMain,
  requiredEnv,
} from "./common.mjs";

const APP_ORDER = ["api", "admin", "app-web"];
const JOB_BY_APP = {
  api: "build-api",
  admin: "build-admin",
  "app-web": "build-app-web",
};

function main() {
  const selectedInput = requiredEnv("SELECTED_APP");
  const selectedApps = selectedInput === "all" ? APP_ORDER : [selectedInput];
  if (selectedApps.some((app) => !APP_ORDER.includes(app))) {
    throw new Error("Unsupported GCP rollback build selection.");
  }
  const targetSha = requiredEnv("TARGET_SHA");
  if (!/^[0-9a-f]{40}$/.test(targetSha)) {
    throw new Error("Build source SHA is not a full lowercase commit SHA.");
  }

  let needs;
  try {
    needs = JSON.parse(requiredEnv("NEEDS_JSON", { trim: false }));
  } catch {
    throw new Error("Build dependency result is malformed JSON.");
  }
  if (needs.preflight?.result !== "success") {
    throw new Error("Reviewed main-branch build gate did not succeed.");
  }
  if (needs.ci?.result !== "success") {
    throw new Error("Reusable CI gate did not succeed.");
  }

  const digestMap = {};
  const lines = ["### GCP rollback images", ""];
  for (const app of selectedApps) {
    const jobId = JOB_BY_APP[app];
    const job = needs[jobId];
    if (job?.result !== "success") {
      throw new Error(`Selected build did not succeed: ${jobId}.`);
    }
    if (job.outputs?.image_sha !== targetSha) {
      throw new Error(`Selected build ${jobId} did not expose the exact SHA.`);
    }
    const digest = job.outputs?.image_digest;
    if (typeof digest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(digest)) {
      throw new Error(
        `Selected build ${jobId} did not expose a valid release digest.`,
      );
    }
    const imageUri = job.outputs?.image_uri;
    if (typeof imageUri !== "string" || !imageUri || /[\r\n]/.test(imageUri)) {
      throw new Error(`Selected build ${jobId} exposed an unsafe image URI.`);
    }
    digestMap[app] = digest;
    lines.push(`- ${jobId}: \`${imageUri}\``, `  - digest: \`${digest}\``);
  }

  const canonicalDigestMap = JSON.stringify(digestMap);
  lines.push(
    "",
    `Release input SHA: \`${targetSha}\``,
    `Release digest map (copy exactly): \`${canonicalDigestMap}\``,
  );
  appendLines(requiredEnv("GITHUB_STEP_SUMMARY"), lines);
  appendLine(
    requiredEnv("GITHUB_OUTPUT"),
    `image_digests=${canonicalDigestMap}`,
  );
}

failClosedMain(main);
