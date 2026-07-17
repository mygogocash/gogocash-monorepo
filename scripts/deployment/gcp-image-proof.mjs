import { spawnSync } from "node:child_process";
import { appendLines, failClosedMain, requiredEnv } from "./common.mjs";

function main() {
  const imageBase = requiredEnv("IMAGE_BASE");
  const imageSha = requiredEnv("IMAGE_SHA");
  const expectedDigest = requiredEnv("EXPECTED_IMAGE_DIGEST");
  const project = requiredEnv("PROJECT");
  if (!/^[0-9a-f]{40}$/.test(imageSha)) {
    throw new Error(
      "image_sha must be a full lowercase 40-character commit SHA.",
    );
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(expectedDigest)) {
    throw new Error("expected_digest must be a lowercase sha256 digest.");
  }
  if (
    !/^[a-z0-9-]+-docker\.pkg\.dev\/[a-z0-9][a-z0-9._:-]*\/[a-z0-9][a-z0-9._\/-]*$/.test(
      imageBase,
    ) ||
    /[\r\n]/.test(project)
  ) {
    throw new Error("Artifact Registry image identity is unsafe.");
  }

  const taggedImage = `${imageBase}:${imageSha}`;
  const result = spawnSync(
    "gcloud",
    [
      "artifacts",
      "docker",
      "images",
      "describe",
      taggedImage,
      "--project",
      project,
      "--format=value(image_summary.digest)",
    ],
    { encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      "SHA-tagged Artifact Registry image is missing or could not be resolved.",
    );
  }
  const resolvedDigest = result.stdout.trim();
  if (!/^sha256:[0-9a-f]{64}$/.test(resolvedDigest)) {
    throw new Error("Artifact Registry returned a malformed image digest.");
  }
  if (resolvedDigest !== expectedDigest) {
    throw new Error(
      "SHA tag digest mismatch; refusing a moved or incorrect image tag.",
    );
  }

  appendLines(requiredEnv("GITHUB_OUTPUT"), [
    `image_sha=${imageSha}`,
    `image_digest=${expectedDigest}`,
    `deploy_image=${imageBase}@${expectedDigest}`,
  ]);
}

failClosedMain(main);
