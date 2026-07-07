import { describe, expect, it } from "vitest";

import {
  resolveGoGoTrackApiUrl,
  resolveGoGoTrackAuthToken,
} from "../../scripts/gototrackEnv.mjs";

describe("gototrackEnv", () => {
  it("resolveGoGoTrackAuthToken > given primary token > then returns it", () => {
    expect(resolveGoGoTrackAuthToken({ GOGOTRACK_AUTH_TOKEN: "primary" })).toBe("primary");
  });

  it("resolveGoGoTrackAuthToken > given typo env only > then falls back to GOTOTRACK_AUTH_TOKEN", () => {
    expect(resolveGoGoTrackAuthToken({ GOTOTRACK_AUTH_TOKEN: "typo" })).toBe("typo");
  });

  it("resolveGoGoTrackAuthToken > given legacy GOGOSENSE token > then falls back", () => {
    expect(resolveGoGoTrackAuthToken({ GOGOSENSE_AUTH_TOKEN: "legacy" })).toBe("legacy");
  });

  it("resolveGoGoTrackApiUrl > given EXPO_PUBLIC_API_URL > then uses it before default", () => {
    expect(
      resolveGoGoTrackApiUrl(
        { EXPO_PUBLIC_API_URL: "https://api-staging.gogocash.co" },
        "https://api.dev.gogocash.co",
      ),
    ).toBe("https://api-staging.gogocash.co");
  });
});
