import { describe, it, expect } from "vitest";
import { detectMiniAppHost } from "./detect";

describe("detectMiniAppHost", () => {
  it("detects LINE from user agent", () => {
    expect(
      detectMiniAppHost({
        navigator: { userAgent: "Mozilla/5.0 Line/14.0.0" },
      })
    ).toBe("line");
  });

  it("detects Telegram when Telegram.WebApp exists", () => {
    expect(
      detectMiniAppHost({
        navigator: { userAgent: "Mozilla/5.0 Mobile" },
        Telegram: { WebApp: {} },
      })
    ).toBe("telegram");
  });

  it("detects generic WebView token in UA", () => {
    expect(
      detectMiniAppHost({
        navigator: {
          userAgent: "Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit/537.36",
        },
      })
    ).toBe("generic_webview");
  });

  it("returns browser when navigator is missing", () => {
    expect(detectMiniAppHost({})).toBe("browser");
  });
});
