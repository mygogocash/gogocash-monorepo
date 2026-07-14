#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultProfile = "development";
const defaultPlatform = "android";
const defaultAuthTokenEnv = "GOGOTRACK_AUTH_TOKEN";
const defaultSource = "github";
const defaultApiUrl = "https://api.dev.gogocash.co";

function nextValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function artifactNameFor({
  profile = defaultProfile,
  platform = defaultPlatform,
} = {}) {
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

    if (arg === "--artifact-name")
      options.artifactName = nextValue(argv, index++, arg);
    else if (arg === "--api-url")
      options.apiUrl = nextValue(argv, index++, arg);
    else if (arg === "--auth-token-env")
      options.authTokenEnv = nextValue(argv, index++, arg);
    else if (arg === "--checkpoint-delay-ms")
      options.checkpointDelayMs = nextValue(argv, index++, arg);
    else if (arg === "--command-file")
      options.commandFile = nextValue(argv, index++, arg);
    else if (arg === "--detect-package")
      options.detectPackage = nextValue(argv, index++, arg);
    else if (arg === "--device") options.device = nextValue(argv, index++, arg);
    else if (arg === "--evidence-dir")
      options.evidenceDir = nextValue(argv, index++, arg);
    else if (arg === "--gcs-prefix") {
      options.gcsPrefix = nextValue(argv, index++, arg);
      options.source = "gcs";
    } else if (arg === "--gcs-uri") {
      options.gcsUri = nextValue(argv, index++, arg);
      options.source = "gcs";
    } else if (arg === "--json") options.outputJson = true;
    else if (arg === "--merchant-apks")
      options.merchantApks = nextValue(argv, index++, arg);
    else if (arg === "--merchant-packages")
      options.merchantPackages = nextValue(argv, index++, arg);
    else if (arg === "--metro-port")
      options.metroPort = nextValue(argv, index++, arg);
    else if (arg === "--output-dir")
      options.outputDir = nextValue(argv, index++, arg);
    else if (arg === "--platform")
      options.platform = nextValue(argv, index++, arg);
    else if (arg === "--profile")
      options.profile = nextValue(argv, index++, arg);
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
    throw new Error(
      "--gcs-uri or --gcs-prefix is required for GCS artifact downloads",
    );
  }

  options.outputDir ??= join(
    "/tmp",
    `gogocash-eas-artifacts-${options.runId ?? "gcs"}`,
  );
  options.commandFile ??= defaultCommandFileFor(options);
  options.evidenceDir ??= defaultEvidenceDirFor(options);

  return options;
}

export function buildGhDownloadArgs({ artifactName, outputDir, runId }) {
  return [
    "run",
    "download",
    String(runId),
    "--name",
    artifactName,
    "--dir",
    outputDir,
  ];
}

export function defaultEvidenceDirFor({ outputDir }) {
  return join(resolve(outputDir), "gototrack-acceptance-evidence");
}

export function defaultCommandFileFor({ outputDir }) {
  return join(resolve(outputDir), "gototrack-preflight-command.sh");
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
    apkFiles.find((path) => basename(path) === `${artifactName}.apk`) ??
    apkFiles[0];

  if (!preferredApk) {
    throw new Error(`No APK found under ${artifactRoot}`);
  }

  const shaFiles = files.filter((path) => path.endsWith(".sha256"));
  const pairedShaFile =
    shaFiles.find(
      (path) => basename(path) === `${basename(preferredApk)}.sha256`,
    ) ?? shaFiles[0];

  const sha256 = pairedShaFile
    ? parseSha256(readFileSync(pairedShaFile, "utf8"))
    : null;

  return {
    apkPath: preferredApk,
    artifactDir: artifactRoot,
    sha256: sha256 ?? sha256File(preferredApk),
    sha256Source: sha256 ? pairedShaFile : "computed-from-apk",
  };
}

function appendOptionalFlag(command, flag, value, { quote = true } = {}) {
  if (value === undefined || value === null || value === "") return;
  command.push(flag, quote ? shellQuote(value) : String(value));
}

export function buildPreflightCommand({
  apiUrl,
  apkPath,
  authTokenEnv = defaultAuthTokenEnv,
  checkpointDelayMs,
  detectPackage,
  device,
  evidenceDir,
  merchantApks,
  merchantPackages,
  metroPort,
  sha256,
}) {
  const command = [
    "PATH=/opt/homebrew/bin:$PATH",
    "/opt/homebrew/bin/npx",
    "npm@10.9.8",
    "run",
    "gototrack:preflight",
    "-w",
    "@gogocash/mobile",
    "--",
    "--auth-token",
    `\"$${authTokenEnv}\"`,
    "--require-auth",
  ];

  appendOptionalFlag(command, "--api-url", apiUrl);
  appendOptionalFlag(command, "--device", device);

  command.push(
    "--install-apk",
    shellQuote(apkPath),
    "--install-apk-sha256",
    sha256,
  );

  appendOptionalFlag(command, "--merchant-apks", merchantApks);
  appendOptionalFlag(command, "--merchant-packages", merchantPackages);

  command.push("--configure-metro-reverse");
  appendOptionalFlag(command, "--metro-port", metroPort, { quote: false });
  command.push("--launch-dev-client");

  command.push("--grant-usage-access");
  appendOptionalFlag(command, "--detect-package", detectPackage);

  command.push(
    "--open-merchant",
    "--return-to-gototrack",
    "--require-nudge",
    "--tap-nudge",
    "--open-deeplink",
    "--capture-device-evidence",
  );

  appendOptionalFlag(command, "--evidence-dir", evidenceDir);
  appendOptionalFlag(command, "--checkpoint-delay-ms", checkpointDelayMs, {
    quote: false,
  });

  return command.join(" ");
}

export function writePreflightCommandFile(commandFile, preflightCommand) {
  const content = `#!/usr/bin/env bash
set -euo pipefail

${preflightCommand}
`;
  mkdirSync(dirname(commandFile), { recursive: true });
  writeFileSync(commandFile, content, "utf8");
  chmodSync(commandFile, 0o755);
  return commandFile;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function printUsage() {
  console.log(`Usage:
  node scripts/gototrack-artifact.mjs --run-id <github-actions-run-id> [options]
  node scripts/gototrack-artifact.mjs --gcs-prefix gs://<bucket>/<prefix> [options]

Options:
  --artifact-name <name>   GitHub artifact name (default: gogocash-development-android)
  --api-url <url>          Pass through to gototrack:preflight
  --auth-token-env <name>  Env var used in the printed preflight command (default: GOGOTRACK_AUTH_TOKEN; GOTOTRACK_AUTH_TOKEN / GOGOSENSE_AUTH_TOKEN still read by preflight)
  --checkpoint-delay-ms <n> Pass through to gototrack:preflight checkpoint capture delay
  --command-file <path>    Write replayable preflight shell command here (default: <output-dir>/gototrack-preflight-command.sh)
  --detect-package <pkg>   Pass through to gototrack:preflight detection probe package
  --device <serial>        Pass through to gototrack:preflight device selector
  --evidence-dir <path>    Pass through to gototrack:preflight evidence output directory
  --gcs-prefix <uri>       GCS prefix containing gogocash-<profile>-<platform>.apk
  --gcs-uri <uri>          Direct GCS URI to the APK; .sha256 is read from the adjacent URI
  --json                   Print machine-readable artifact details
  --merchant-apks <paths>  Pass through to gototrack:preflight merchant APK install list
  --merchant-packages <pkgs> Pass through to gototrack:preflight controlled merchant packages
  --metro-port <port>      Pass through to gototrack:preflight Metro reverse port
  --output-dir <path>      Download/extract destination (default: /tmp/gogocash-eas-artifacts-<run-id>)
  --platform <platform>    Artifact platform segment (default: android)
  --profile <profile>      Artifact profile segment (default: development)
  --skip-download          Reuse files already present under --output-dir
  --source <github|gcs>    Artifact source (default: github; inferred as gcs with --gcs-prefix/--gcs-uri)
`);
}

export function main(
  argv = process.argv.slice(2),
  env = process.env,
  logger = console,
) {
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
        const result = spawnSync(gcloud, args, {
          encoding: "utf8",
          stdio: "pipe",
        });

        if (result.status !== 0) {
          const message =
            result.stderr || result.stdout || "gcloud storage cp failed";
          if (index === 1) {
            logger.warn?.(
              `[gototrack:artifact] SHA sidecar download failed; will compute SHA from APK. ${message}`.trim(),
            );
          } else {
            throw new Error(
              `Failed to download GCS artifact ${options.gcsUri}: ${message}`.trim(),
            );
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
          }`.trim(),
        );
      }
    }
  }

  const artifact = resolveDownloadedArtifact(options);
  const preflightCommand = buildPreflightCommand({
    apiUrl: options.apiUrl ?? defaultApiUrl,
    apkPath: artifact.apkPath,
    authTokenEnv: options.authTokenEnv,
    checkpointDelayMs: options.checkpointDelayMs,
    detectPackage: options.detectPackage,
    device: options.device,
    evidenceDir: options.evidenceDir,
    merchantApks: options.merchantApks,
    merchantPackages: options.merchantPackages,
    metroPort: options.metroPort,
    sha256: artifact.sha256,
  });
  writePreflightCommandFile(options.commandFile, preflightCommand);
  const output = {
    ...artifact,
    artifactName: options.artifactName,
    commandFile: options.commandFile,
    gcsUri: options.gcsUri,
    preflightCommand,
    source: options.source,
  };

  if (options.outputJson) {
    logger.log(JSON.stringify(output, null, 2));
  } else {
    logger.log(`GoGoTrack dev-client artifact: ${options.artifactName}`);
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
