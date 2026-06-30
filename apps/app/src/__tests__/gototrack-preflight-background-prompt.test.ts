import { describe, expect, it } from "vitest";

// @ts-ignore - The app preflight helper is a Node .mjs CLI, not a typed app module.
const preflight = await import("../../scripts/gototrack-preflight.mjs");

describe("GoGoTrack preflight background prompt markers", () => {
  it("uiXmlContainsBackgroundPromptMarkers > given monitor copy > then passes", () => {
    expect(
      preflight.uiXmlContainsBackgroundPromptMarkers(
        "GoGoTrack is watching for cashback\nCashback available\nAccept",
      ),
    ).toBe(true);
  });

  it("uiXmlContainsBackgroundPromptMarkers > given unrelated dump > then fails", () => {
    expect(
      preflight.uiXmlContainsBackgroundPromptMarkers(
        "NotificationRecord: pkg=com.example.app",
      ),
    ).toBe(false);
  });

  it("parseArgs > given --require-background-prompt > then enables background prompt check", () => {
    const options = preflight.parseArgs(["--require-background-prompt"], {
      NODE_ENV: "test",
    });
    expect(options.requireBackgroundPrompt).toBe(true);
  });

  it("backgroundPromptDumpResult > given markers in dump > then passes", () => {
    const result = preflight.backgroundPromptDumpResult(
      "GoGoTrack is watching for cashback\nAccept",
    );

    expect(result).toMatchObject({
      status: "pass",
      name: "GoGoTrack background prompt notification",
    });
  });

  it("backgroundPromptDumpResult > given unrelated dump > then fails", () => {
    const result = preflight.backgroundPromptDumpResult(
      "NotificationRecord: pkg=com.example.app",
    );

    expect(result).toMatchObject({
      status: "fail",
      name: "GoGoTrack background prompt notification",
    });
  });

  it("backgroundPromptNotificationResult > given flag off > then skips", () => {
    expect(
      preflight.backgroundPromptNotificationResult(
        { requireBackgroundPrompt: false },
        "adb",
        { serial: "device-1" },
      ),
    ).toBeNull();
  });
});
