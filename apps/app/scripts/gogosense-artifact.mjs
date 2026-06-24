#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultProfile = "development";
const defaultPlatform = "android";
const defaultAuthTokenEnv = "GOGOSENSE_AUTH_TOKEN";
const defaultSource = "github";

function nextValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function artifactNameFor({ profile = defaultProfile, platform = defaultPlatform } = {}) {
  return `gogocash-${profile}-${platform}`;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    authTokenEnv: defaultAuthTokenEnv,
    outputJson: false,
    platform: defaultPlatform,
    profile: defaultProfile,
    skipDownload: false,
    source: defaultSource,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--artifact-name") options.artifactName = nextValue(argv, index++, arg);
    else if (arg === "--auth-token-env") options.authTokenEnv = nextValue(argv, index++, arg);
    else if (arg === "--gcs-prefix") {
      options.gcsPrefix = nextValue(argv, index++, arg);
      options.source = "gcs";
    } else if (arg === "--gcs-uri") {
      options.gcsUri = nextValue(argv, index++, arg);
      options.source = "gcs";
    }
    else if (arg === "--json") options.outputJson = true;
    else if (arg === "--output-dir") options.outputDir = nextValue(argv, index++, arg);
    else if (arg === "--platform") options.platform = nextValue(argv, index++, arg);
    else if (arg === "--profile") options.profile = nextValue(argv, index++, arg);
    else if (arg === "--run-id") options.runId = nextValue(argv, index++, arg);
    else if (arg === "--source") options.source = nextValue(argv, index++, arg);
    else if (arg === "--skip-download") options.skipDownload = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  options.artifactName ??= artifactNameFor(options);

  if (!["github", "gcs"].includes(options.source)) {
    throw new Error("--source must be github or gcs");
  }

  if (options.source === "gcs" && !options.gcsUri && options.gcsPrefix) {
    options.gcsUri = gcsApkUriFor(options);
  }

  if (!options.help && options.source === "github" && !options.runId) {
    throw new Error("--run-id is required for GitHub artifact downloads");
  }

  if (!options.help && options.source === "gcs" && !options.gcsUri) {
    throw new Error("--gcs-uri or --gcs-prefix is required for GCS artifact downloads");
  }

  options.outputDir ??= join("/tmp", `gogocash-eas-artifacts-${options.runId ?? "gcs"}`);

  return options;
}

export function buildGhDownloadArgs({ artifactName, outputDir, runId }) {
  return ["run", "download", String(runId), "--name", artifactName, "--dir", outputDir];
}

export function gcsApkUriFor({
  gcsPrefix,
  platform = defaultPlatform,
  profile = defaultProfile,
} = {}) {
  if (!gcsPrefix) {
    throw new Error("--gcs-prefix is required");
  }

  return `${String(gcsPrefix).replace(/\/+$/, "")}/gogocash-${profile}-${platform}.apk`;
}

export function buildGcloudDownloadPlan({ gcsUri, outputDir }) {
  if (!gcsUri) {
    throw new Error("--gcs-uri is required");
  }

  const apkPath = join(resolve(outputDir), basename(gcsUri));
  const shaPath = `${apkPath}.sha256`;

  return {
    apkPath,
    commands: [
      ["storage", "cp", gcsUri, apkPath],
      ["storage", "cp", `${gcsUri}.sha256`, shaPath],
    ],
    shaPath,
  };
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return walkFiles(path);
    return [path];
  });
}

export function parseSha256(text) {
  const match = String(text).match(/\b[a-fA-F0-9]{64}\b/);
  return match ? match[0].toLowerCase() : null;
}

export function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function resolveDownloadedArtifact({ artifactName, outputDir }) {
  const artifactRoot = resolve(outputDir);
  const files = walkFiles(artifactRoot);
  const apkFiles = files.filter((path) => path.endsWith(".apk"));

  const preferredApk =
    apkFiles.find((path) => basename(path) === `${artifactName}.apk`) ?? apkFiles[0];

  if (!preferredApk) {
    throw new Error(`No APK found under ${artifactRoot}`);
  }

  const shaFiles = files.filter((path) => path.endsWith(".sha256"));
  const pairedShaFile =
    shaFiles.find((path) => basename(path) === `${basename(preferredApk)}.sha256`) ??
    shaFiles[0];

  const sha256 = pairedShaFile ? parseSha256(readFileSync(pairedShaFile, "utf8")) : null;

  return {
    apkPath: preferredApk,
    artifactDir: artifactRoot,
    sha256: sha256 ?? sha256File(preferredApk),
    sha256Source: sha256 ? pairedShaFile : "computed-from-apk",
  };
}

export function buildPreflightCommand({ apkPath, authTokenEnv = defaultAuthTokenEnv, sha256 }) {
  return [
    "PATH=/opt/homebrew/bin:$PATH",
    "/opt/homebrew/bin/npx",
    "npm@10.9.0",
    "run",
    "gogosense:preflight",
    "-w",
    "@gogocash/mobile",
    "--",
    "--auth-token",
    `\"$${authTokenEnv}\"`,
    "--install-apk",
    shellQuote(apkPath),
    "--install-apk-sha256",
    sha256,
    "--configure-metro-reverse",
    "--grant-usage-access",
    "--open-merchant",
    "--return-to-gogosense",
    "--require-nudge",
    "--tap-nudge",
    "--open-deeplink",
    "--capture-device-evidence",
  ].join(" ");
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function printUsage() {
  console.log(`Usage:
  node scripts/gogosense-artifact.mjs --run-id <github-actions-run-id> [options]
  node scripts/gogosense-artifact.mjs --gcs-prefix gs://<bucket>/<prefix> [options]

Options:
  --artifact-name <name>   GitHub artifact name (default: gogocash-development-android)
  --auth-token-env <name>  Env var used in the printed preflight command (default: GOGOSENSE_AUTH_TOKEN)
  --gcs-prefix <uri>       GCS prefix containing gogocash-<profile>-<platform>.apk
  --gcs-uri <uri>          Direct GCS URI to the APK; .sha256 is read from the adjacent URI
  --json                   Print machine-readable artifact details
  --output-dir <path>      Download/extract destination (default: /tmp/gogocash-eas-artifacts-<run-id>)
  --platform <platform>    Artifact platform segment (default: android)
  --profile <profile>      Artifact profile segment (default: development)
  --skip-download          Reuse files already present under --output-dir
  --source <github|gcs>    Artifact source (default: github; inferred as gcs with --gcs-prefix/--gcs-uri)
`);
}

export function main(argv = process.argv.slice(2), env = process.env, logger = console) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return 0;
  }

  mkdirSync(options.outputDir, { recursive: true });

  if (!options.skipDownload) {
    if (options.source === "gcs") {
      const gcloud = env.GCLOUD_BIN || "gcloud";
      const plan = buildGcloudDownloadPlan({
        gcsUri: options.gcsUri,
        outputDir: options.outputDir,
      });

      for (const [index, args] of plan.commands.entries()) {
        const result = spawnSync(gcloud, args, { encoding: "utf8", stdio: "pipe" });

        if (result.status !== 0) {
          const message = result.stderr || result.stdout || "gcloud storage cp failed";
          if (index === 1) {
            logger.warn?.(
              `[gogosense:artifact] SHA sidecar download failed; will compute SHA from APK. ${message}`.trim()
            );
          } else {
            throw new Error(`Failed to download GCS artifact ${options.gcsUri}: ${message}`.trim());
          }
        }
      }
    } else {
      const gh = env.GH_BIN || "gh";
      const ghArgs = buildGhDownloadArgs(options);
      const result = spawnSync(gh, ghArgs, { encoding: "utf8", stdio: "pipe" });

      if (result.status !== 0) {
        throw new Error(
          `Failed to download artifact ${options.artifactName} from run ${options.runId}: ${
            result.stderr || result.stdout || "gh run download failed"
          }`.trim()
        );
      }
    }
  }

  const artifact = resolveDownloadedArtifact(options);
  const preflightCommand = buildPreflightCommand({
    apkPath: artifact.apkPath,
    authTokenEnv: options.authTokenEnv,
    sha256: artifact.sha256,
  });
  const output = {
    ...artifact,
    artifactName: options.artifactName,
    gcsUri: options.gcsUri,
    preflightCommand,
    source: options.source,
  };

  if (options.outputJson) {
    logger.log(JSON.stringify(output, null, 2));
  } else {
    logger.log(`GoGoSense dev-client artifact: ${options.artifactName}`);
    logger.log(`Source: ${options.source}`);
    if (options.gcsUri) logger.log(`GCS URI: ${options.gcsUri}`);
    logger.log(`APK: ${artifact.apkPath}`);
    logger.log(`SHA-256: ${artifact.sha256}`);
    logger.log(`SHA source: ${artifact.sha256Source}`);
    logger.log("");
    logger.log("Acceptance preflight command:");
    logger.log(preflightCommand);
  }

  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
