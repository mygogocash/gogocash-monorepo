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
      apkPath: "/tmp/gogocash-eas-artifacts-28014696785/gogocash-development-android/gogocash-development-android.apk",
      authTokenEnv: "GOGOSENSE_AUTH_TOKEN",
      sha256: "5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a",
    });

    expect(command).toContain("run gogosense:preflight -w @gogocash/mobile --");
    expect(command).toContain("--auth-token \"$GOGOSENSE_AUTH_TOKEN\"");
    expect(command).toContain("--install-apk '/tmp/gogocash-eas-artifacts-28014696785/");
    expect(command).toContain(
      "--install-apk-sha256 5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a"
    );
    expect(command).toContain("--configure-metro-reverse");
    expect(command).toContain("--require-nudge");
    expect(command).toContain("--tap-nudge");
    expect(command).toContain("--open-deeplink");
    expect(command).toContain("--capture-device-evidence");
  });
});
