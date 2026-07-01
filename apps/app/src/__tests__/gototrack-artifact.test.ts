import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const artifact = await import("../../scripts/gototrack-artifact.mjs");

const tempDirs: string[] = [];

async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), "gototrack-artifact-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("GoGoTrack artifact helper", () => {
  it("parses the native build run with GoGoTrack artifact defaults", () => {
    expect(artifact.parseArgs(["--run-id", "28014696785"])).toMatchObject({
      artifactName: "gogocash-development-android",
      authTokenEnv: "GOGOTRACK_AUTH_TOKEN",
      commandFile: "/tmp/gogocash-eas-artifacts-28014696785/gototrack-preflight-command.sh",
      evidenceDir:
        "/tmp/gogocash-eas-artifacts-28014696785/gototrack-acceptance-evidence",
      outputDir: "/tmp/gogocash-eas-artifacts-28014696785",
      platform: "android",
      profile: "development",
      runId: "28014696785",
    });
  });

  it("builds the GitHub artifact download command for the run", () => {
    expect(
      artifact.buildGhDownloadArgs({
        artifactName: "gogocash-development-android",
        outputDir: "/tmp/gogocash-eas-artifacts-28014696785",
        runId: "28014696785",
      })
    ).toEqual([
      "run",
      "download",
      "28014696785",
      "--name",
      "gogocash-development-android",
      "--dir",
      "/tmp/gogocash-eas-artifacts-28014696785",
    ]);
  });

  it("parses a GCS artifact prefix without requiring a GitHub run id", () => {
    expect(
      artifact.parseArgs([
        "--gcs-prefix",
        "gs://gogocash-native-artifacts/gototrack/development",
      ])
    ).toMatchObject({
      gcsPrefix: "gs://gogocash-native-artifacts/gototrack/development",
      gcsUri:
        "gs://gogocash-native-artifacts/gototrack/development/gogocash-development-android.apk",
      commandFile: "/tmp/gogocash-eas-artifacts-gcs/gototrack-preflight-command.sh",
      evidenceDir: "/tmp/gogocash-eas-artifacts-gcs/gototrack-acceptance-evidence",
      outputDir: "/tmp/gogocash-eas-artifacts-gcs",
      source: "gcs",
    });
  });

  it("preserves an explicit evidence directory for acceptance artifacts", () => {
    expect(
      artifact.parseArgs([
        "--run-id",
        "28014696785",
        "--command-file",
        "/tmp/custom-gototrack-command.sh",
        "--evidence-dir",
        "/tmp/custom-gototrack-evidence",
      ])
    ).toMatchObject({
      commandFile: "/tmp/custom-gototrack-command.sh",
      evidenceDir: "/tmp/custom-gototrack-evidence",
      outputDir: "/tmp/gogocash-eas-artifacts-28014696785",
    });
  });

  it("writes a replayable preflight command file", async () => {
    const outputDir = await tempDir();
    const commandFile = join(outputDir, "nested", "gototrack-preflight-command.sh");
    const preflightCommand =
      "PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/npx npm@10.9.0 run gototrack:preflight -w @gogocash/mobile -- --require-auth";

    expect(artifact.writePreflightCommandFile(commandFile, preflightCommand)).toBe(commandFile);

    await expect(readFile(commandFile, "utf8")).resolves.toBe(
      `#!/usr/bin/env bash
set -euo pipefail

${preflightCommand}
`
    );
    expect((await stat(commandFile)).mode & 0o111).toBeGreaterThan(0);
  });

  it("builds the gcloud download plan for a mirrored native artifact", () => {
    expect(
      artifact.buildGcloudDownloadPlan({
        gcsUri:
          "gs://gogocash-native-artifacts/gototrack/development/gogocash-development-android.apk",
        outputDir: "/tmp/gogocash-eas-artifacts-gcs",
      })
    ).toEqual({
      apkPath: "/tmp/gogocash-eas-artifacts-gcs/gogocash-development-android.apk",
      commands: [
        [
          "storage",
          "cp",
          "gs://gogocash-native-artifacts/gototrack/development/gogocash-development-android.apk",
          "/tmp/gogocash-eas-artifacts-gcs/gogocash-development-android.apk",
        ],
        [
          "storage",
          "cp",
          "gs://gogocash-native-artifacts/gototrack/development/gogocash-development-android.apk.sha256",
          "/tmp/gogocash-eas-artifacts-gcs/gogocash-development-android.apk.sha256",
        ],
      ],
      shaPath: "/tmp/gogocash-eas-artifacts-gcs/gogocash-development-android.apk.sha256",
    });
  });

  it("resolves a downloaded APK and published SHA file from the extracted artifact", async () => {
    const outputDir = await tempDir();
    const artifactDir = join(outputDir, "gogocash-development-android");
    const apkPath = join(artifactDir, "gogocash-development-android.apk");
    const sha256 =
      "5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a";

    await mkdir(artifactDir, { recursive: true });
    await writeFile(apkPath, "apk-bytes");
    await writeFile(`${apkPath}.sha256`, `${sha256}  gogocash-development-android.apk\n`);

    expect(
      artifact.resolveDownloadedArtifact({
        artifactName: "gogocash-development-android",
        outputDir,
      })
    ).toEqual({
      apkPath,
      artifactDir: outputDir,
      sha256,
      sha256Source: `${apkPath}.sha256`,
    });
  });

  it("computes the APK hash when a SHA file is absent", async () => {
    const outputDir = await tempDir();
    const apkPath = join(outputDir, "gogocash-development-android.apk");
    const expectedSha = createHash("sha256").update("apk-bytes").digest("hex");

    await writeFile(apkPath, "apk-bytes");

    expect(
      artifact.resolveDownloadedArtifact({
        artifactName: "gogocash-development-android",
        outputDir,
      })
    ).toMatchObject({
      apkPath,
      sha256: expectedSha,
      sha256Source: "computed-from-apk",
    });
  });

  it("prints the acceptance preflight command with install, nudge, and deeplink gates", () => {
    const command = artifact.buildPreflightCommand({
      apiUrl: "https://api.dev.gogocash.co",
      apkPath: "/tmp/gogocash-eas-artifacts-28014696785/gogocash-development-android/gogocash-development-android.apk",
      authTokenEnv: "GOGOTRACK_AUTH_TOKEN",
      checkpointDelayMs: "1500",
      detectPackage: "com.shopee.th",
      device: "emulator-5554",
      evidenceDir: "/tmp/gototrack-acceptance",
      merchantApks: "/tmp/com.shopee.th.apk,/tmp/config.arm64_v8a.apk",
      merchantPackages: "com.shopee.th,com.lazada.android",
      metroPort: "8081",
      sha256: "5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a",
    });

    expect(command).toContain("run gototrack:preflight -w @gogocash/mobile --");
    expect(command).toContain("--auth-token \"$GOGOTRACK_AUTH_TOKEN\"");
    expect(command).toContain("--require-auth");
    expect(command).toContain("--api-url 'https://api.dev.gogocash.co'");
    expect(command).toContain("--device 'emulator-5554'");
    expect(command).toContain("--install-apk '/tmp/gogocash-eas-artifacts-28014696785/");
    expect(command).toContain(
      "--install-apk-sha256 5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a"
    );
    expect(command).toContain("--merchant-apks '/tmp/com.shopee.th.apk,/tmp/config.arm64_v8a.apk'");
    expect(command).toContain("--merchant-packages 'com.shopee.th,com.lazada.android'");
    expect(command).toContain("--configure-metro-reverse");
    expect(command).toContain("--launch-dev-client");
    expect(command).toContain("--metro-port 8081");
    expect(command).toContain("--detect-package 'com.shopee.th'");
    expect(command).toContain("--require-nudge");
    expect(command).toContain("--tap-nudge");
    expect(command).toContain("--open-deeplink");
    expect(command).toContain("--capture-device-evidence");
    expect(command).toContain("--evidence-dir '/tmp/gototrack-acceptance'");
    expect(command).toContain("--checkpoint-delay-ms 1500");
  });
});
