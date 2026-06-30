import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(testDir, "../..");
const nativeModuleSource = readFileSync(
  resolve(
    mobileRoot,
    "modules/gototrack-detector/android/src/main/java/co/gogocash/gototrack/GototrackUsageAccess.kt"
  ),
  "utf8"
);

describe("GoGoTrack native UsageStats source contract", () => {
  it("foreground package detection accepts legacy and modern UsageEvents foreground constants", () => {
    expect(nativeModuleSource).toContain("fun isForegroundEvent(eventType: Int)");
    expect(nativeModuleSource).toContain("UsageEvents.Event.MOVE_TO_FOREGROUND");
    expect(nativeModuleSource).toContain("UsageEvents.Event.ACTIVITY_RESUMED");
  });
});
