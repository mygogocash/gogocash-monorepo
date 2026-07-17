import { appendLines, failClosedMain, requiredEnv } from "./common.mjs";

const JOBS_BY_SELECTION = {
  api: ["release-api"],
  admin: ["release-admin"],
  "app-web": ["release-app-web"],
  all: ["release-api", "release-admin", "release-app-web"],
};

function main() {
  const sha = requiredEnv("IMAGE_SHA");
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(
      "image_sha must be a full lowercase 40-character commit SHA.",
    );
  }
  let needs;
  try {
    needs = JSON.parse(requiredEnv("NEEDS_JSON", { trim: false }));
  } catch {
    throw new Error("Release dependency result is malformed JSON.");
  }
  if (needs.preflight?.result !== "success") {
    throw new Error("Reviewed main-branch release gate did not succeed.");
  }
  const selected = JOBS_BY_SELECTION[requiredEnv("SELECTED_APP")];
  if (!selected) throw new Error("Unsupported GCP rollback release selection.");

  const expectedDigests = {
    "release-api": process.env.EXPECTED_API_DIGEST || "",
    "release-admin": process.env.EXPECTED_ADMIN_DIGEST || "",
    "release-app-web": process.env.EXPECTED_APP_WEB_DIGEST || "",
  };
  const lines = ["### GCP rollback release", "", `Source SHA: \`${sha}\``];
  for (const jobId of selected) {
    const job = needs[jobId];
    if (job?.result !== "success") {
      throw new Error(`Selected release did not succeed: ${jobId}.`);
    }
    if (job.outputs?.image_sha !== sha) {
      throw new Error(`Selected release ${jobId} did not consume exact SHA.`);
    }
    if (
      !/^sha256:[0-9a-f]{64}$/.test(expectedDigests[jobId]) ||
      job.outputs?.image_digest !== expectedDigests[jobId]
    ) {
      throw new Error(
        `Selected release ${jobId} did not consume its build-reported digest.`,
      );
    }
    const serviceUrl = job.outputs?.service_url;
    if (
      typeof serviceUrl !== "string" ||
      !serviceUrl.startsWith("https://") ||
      /[\r\n]/.test(serviceUrl)
    ) {
      throw new Error(`Selected release ${jobId} has no safe service URL.`);
    }
    lines.push(
      `- ${jobId}: ${serviceUrl}`,
      `  - digest: \`${job.outputs.image_digest}\``,
    );
  }
  appendLines(requiredEnv("GITHUB_STEP_SUMMARY"), lines);
}

failClosedMain(main);
