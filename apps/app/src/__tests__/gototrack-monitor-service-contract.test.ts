import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(testDir, "../..");
const monitorSource = readFileSync(
  resolve(
    mobileRoot,
    "modules/gototrack-detector/android/src/main/java/co/gogocash/gototrack/GototrackMonitorService.kt",
  ),
  "utf8",
);

describe("GoGoTrack monitor service contract", () => {
  it("uses a high-importance prompt channel and faster polling", () => {
    expect(monitorSource).toContain('PROMPT_CHANNEL_ID = "gototrack_prompt"');
    expect(monitorSource).toContain("IMPORTANCE_HIGH");
    expect(monitorSource).toContain("POLL_INTERVAL_MS = 15_000L");
    expect(monitorSource).toContain("SAME_PACKAGE_REDETECT_MS");
  });

  it("prompt notifications are dismissible heads-up alerts", () => {
    expect(monitorSource).toContain(".setOngoing(false)");
    expect(monitorSource).toContain(".setAutoCancel(true)");
    expect(monitorSource).toContain("PRIORITY_HIGH");
  });
});
