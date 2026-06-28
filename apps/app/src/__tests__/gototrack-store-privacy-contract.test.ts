import * as fs from "node:fs";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

const appRoot = process.cwd();

const readAppFile = (relativePath: string) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");

describe("GoGoTrack store privacy contract", () => {
  it("matches the native detector permissions and platform support", () => {
    const appConfigSource = readAppFile("app.config.ts");
    const pluginSource = readAppFile("plugins/withGototrackUsageAccess.js");
    const moduleConfig = JSON.parse(readAppFile("modules/gototrack-detector/expo-module.config.json")) as {
      platforms?: string[];
    };
    const privacyContract = readAppFile("docs/gototrack-store-privacy-contract.md");

    expect(appConfigSource).toContain("./plugins/withGototrackUsageAccess");
    expect(moduleConfig.platforms).toEqual(["android"]);
    expect(pluginSource).toContain("android.permission.PACKAGE_USAGE_STATS");
    expect(privacyContract).toContain("Declare Usage Access/restricted permission");

    for (const disallowedAccess of [
      "android.permission.QUERY_ALL_PACKAGES",
      "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
      "<service",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_CONTACTS",
    ]) {
      expect(pluginSource).not.toContain(disallowedAccess);
      expect(privacyContract).toContain(`No \`${disallowedAccess}\``);
    }

    expect(privacyContract).toContain("App activity > Installed apps");
    expect(privacyContract).toContain("optional/user-controlled");
    expect(privacyContract).toContain("No GoGoTrack native detector");
    expect(privacyContract).toContain("No broad installed-app inventory upload");
  });
});
