import { appendLines, failClosedMain, requiredEnv } from "./common.mjs";

const APP_ORDER = ["api", "admin", "app-web"];
const OUTPUT_BY_APP = {
  api: "api_digest",
  admin: "admin_digest",
  "app-web": "app_web_digest",
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main() {
  if (requiredEnv("TARGET_REF") !== "refs/heads/main") {
    throw new Error(
      "GCP rollback releases must be dispatched from refs/heads/main.",
    );
  }
  const imageSha = requiredEnv("IMAGE_SHA");
  if (!/^[0-9a-f]{40}$/.test(imageSha)) {
    throw new Error(
      "image_sha must be a full lowercase 40-character commit SHA.",
    );
  }
  const selectedInput = requiredEnv("SELECTED_APP");
  const selectedApps = selectedInput === "all" ? APP_ORDER : [selectedInput];
  if (selectedApps.some((app) => !APP_ORDER.includes(app))) {
    throw new Error("Unsupported GCP rollback app selection.");
  }

  const raw = requiredEnv("IMAGE_DIGESTS_JSON", { trim: false });
  const digestCapture = "(sha256:[0-9a-f]{64})";
  const canonicalPattern = new RegExp(
    `^\\{${selectedApps
      .map((app) => `"${escapeRegex(app)}":"${digestCapture}"`)
      .join(",")}\\}$`,
  );
  const match = canonicalPattern.exec(raw);
  if (!match) {
    throw new Error(
      `image_digests must be canonical one-line JSON with exactly these ordered keys: ${selectedApps.join(", ")}.`,
    );
  }

  const outputs = [];
  const canonicalMap = {};
  selectedApps.forEach((app, index) => {
    const digest = match[index + 1];
    canonicalMap[app] = digest;
    outputs.push(`${OUTPUT_BY_APP[app]}=${digest}`);
  });
  if (JSON.stringify(canonicalMap) !== raw) {
    throw new Error("image_digests is not in canonical form.");
  }
  appendLines(requiredEnv("GITHUB_OUTPUT"), outputs);
}

failClosedMain(main);
