import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const artifact = await import("../../scripts/gogosense-artifact.mjs");

const tempDirs: string[] = [];

async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), "gogosense-artifact-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("GoGoSense artifact helper", () => {
  it("parses the native build run with GoGoSense artifact defaults", () => {
    expect(artifact.parseArgs(["--run-id", "28014696785"])).toMatchObject({
      artifactName: "gogocash-development-android",
      authTokenEnv: "GOGOSENSE_AUTH_TOKEN",
      evidenceDir:
        "/tmp/gogocash-eas-artifacts-28014696785/gogosense-acceptance-evidence",
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
        "gs://gogocash-native-artifacts/gogosense/development",
      ])
    ).toMatchObject({
      gcsPrefix: "gs://gogocash-native-artifacts/gogosense/development",
      gcsUri:
        "gs://gogocash-native-artifacts/gogosense/development/gogocash-development-android.apk",
      evidenceDir: "/tmp/gogocash-eas-artifacts-gcs/gogosense-acceptance-evidence",
      outputDir: "/tmp/gogocash-eas-artifacts-gcs",
      source: "gcs",
    });
  });

  it("preserves an explicit evidence directory for acceptance artifacts", () => {
    expect(
      artifact.parseArgs([
        "--run-id",
        "28014696785",
        "--evidence-dir",
        "/tmp/custom-gogosense-evidence",
      ])
    ).toMatchObject({
      evidenceDir: "/tmp/custom-gogosense-evidence",
      outputDir: "/tmp/gogocash-eas-artifacts-28014696785",
    });
  });

  it("builds the gcloud download plan for a mirrored native artifact", () => {
    expect(
      artifact.buildGcloudDownloadPlan({
        gcsUri:
          "gs://gogocash-native-artifacts/gogosense/development/gogocash-development-android.apk",
        outputDir: "/tmp/gogocash-eas-artifacts-gcs",
      })
    ).toEqual({
      apkPath: "/tmp/gogocash-eas-artifacts-gcs/gogocash-development-android.apk",
      commands: [
        [
          "storage",
          "cp",
          "gs://gogocash-native-artifacts/gogosense/development/gogocash-development-android.apk",
          "/tmp/gogocash-eas-artifacts-gcs/gogocash-development-android.apk",
        ],
        [
          "storage",
          "cp",
          "gs://gogocash-native-artifacts/gogosense/development/gogocash-development-android.apk.sha256",
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
      apiUrl: "https://api-staging.gogocash.co",
      apkPath: "/tmp/gogocash-eas-artifacts-28014696785/gogocash-development-android/gogocash-development-android.apk",
      authTokenEnv: "GOGOSENSE_AUTH_TOKEN",
      checkpointDelayMs: "1500",
      detectPackage: "com.shopee.th",
      device: "emulator-5554",
      evidenceDir: "/tmp/gogosense-acceptance",
      merchantApks: "/tmp/com.shopee.th.apk,/tmp/config.arm64_v8a.apk",
      merchantPackages: "com.shopee.th,com.lazada.android",
      metroPort: "8081",
      sha256: "5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a",
    });

    expect(command).toContain("run gogosense:preflight -w @gogocash/mobile --");
    expect(command).toContain("--auth-token \"$GOGOSENSE_AUTH_TOKEN\"");
    expect(command).toContain("--api-url 'https://api-staging.gogocash.co'");
    expect(command).toContain("--device 'emulator-5554'");
    expect(command).toContain("--install-apk '/tmp/gogocash-eas-artifacts-28014696785/");
    expect(command).toContain(
      "--install-apk-sha256 5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a"
    );
    expect(command).toContain("--merchant-apks '/tmp/com.shopee.th.apk,/tmp/config.arm64_v8a.apk'");
    expect(command).toContain("--merchant-packages 'com.shopee.th,com.lazada.android'");
    expect(command).toContain("--configure-metro-reverse");
    expect(command).toContain("--metro-port 8081");
    expect(command).toContain("--detect-package 'com.shopee.th'");
    expect(command).toContain("--require-nudge");
    expect(command).toContain("--tap-nudge");
    expect(command).toContain("--open-deeplink");
    expect(command).toContain("--capture-device-evidence");
    expect(command).toContain("--evidence-dir '/tmp/gogosense-acceptance'");
    expect(command).toContain("--checkpoint-delay-ms 1500");
  });
});
