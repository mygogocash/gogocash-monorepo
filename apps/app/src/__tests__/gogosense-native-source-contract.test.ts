import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(testDir, "../..");
const nativeModuleSource = readFileSync(
  resolve(
    mobileRoot,
    "modules/gogosense-detector/android/src/main/java/co/gogocash/gogosense/GogosenseDetectorModule.kt"
  ),
  "utf8"
);

describe("GoGoSense native UsageStats source contract", () => {
  it("foreground package detection accepts legacy and modern UsageEvents foreground constants", () => {
    expect(nativeModuleSource).toContain("private fun isForegroundEvent(eventType: Int)");
    expect(nativeModuleSource).toContain("UsageEvents.Event.MOVE_TO_FOREGROUND");
    expect(nativeModuleSource).toContain("UsageEvents.Event.ACTIVITY_RESUMED");
    expect(nativeModuleSource).toContain("Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q");
    expect(nativeModuleSource).toContain("if (isForegroundEvent(event.eventType)");
  });
});
