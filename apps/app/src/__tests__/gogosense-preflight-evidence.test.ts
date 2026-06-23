import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const preflight = await import("../../scripts/gogosense-preflight.mjs");

describe("GoGoSense preflight evidence bundle", () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { force: true, recursive: true });
      tempDir = null;
    }
  });

  it("lists checkpoint UI hierarchy files for final Android acceptance evidence", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gogosense-evidence-summary-"));

    preflight.writeEvidenceBundle(
      {
        context: {
          activationDeeplink: "https://invl.me/example",
          apiUrl: "https://api.example.test",
          appPackage: "co.gogocash.app",
          authTokenPresent: true,
          device: "emulator-5554",
          foregroundPackage: "com.shopee.th",
          installedMerchantPackages: ["com.shopee.th"],
          merchantPackages: ["com.shopee.th"],
          merchants: [],
        },
        results: [
          { detail: "device evidence captured", name: "device evidence captured", status: "pass" },
          { detail: "gogocash://gogosense", name: "GoGoSense hub return", status: "pass" },
          { detail: "https://invl.me/example", name: "activation deeplink open", status: "pass" },
        ],
      },
      tempDir
    );

    const checklist = await readFile(join(tempDir, "acceptance-checklist.md"), "utf8");

    expect(checklist).toContain("- merchant-foreground-ui.xml");
    expect(checklist).toContain("- gogosense-hub-ui.xml");
    expect(checklist).toContain("- activation-deeplink-ui.xml");
  });
});
