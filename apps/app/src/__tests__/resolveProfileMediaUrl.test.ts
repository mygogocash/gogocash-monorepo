import { describe, expect, it } from "vitest";

import { resolveProfileMediaUrl } from "../lib/resolveProfileMediaUrl";

describe("resolveProfileMediaUrl", () => {
  const apiBaseUrl = "https://api-staging.gogocash.co/";

  it("given an empty ref > then returns null", () => {
    expect(resolveProfileMediaUrl("", apiBaseUrl)).toBeNull();
    expect(resolveProfileMediaUrl("   ", apiBaseUrl)).toBeNull();
    expect(resolveProfileMediaUrl(undefined, apiBaseUrl)).toBeNull();
  });

  it("given an absolute URL > then returns it unchanged", () => {
    expect(resolveProfileMediaUrl("https://cdn.example.com/a.png", apiBaseUrl)).toBe(
      "https://cdn.example.com/a.png",
    );
    expect(resolveProfileMediaUrl("http://localhost:8080/x.jpg", apiBaseUrl)).toBe(
      "http://localhost:8080/x.jpg",
    );
  });

  it("given a local-media ref > then builds the authenticated stream URL", () => {
    const ref = "local-media:profile-avatars/user-1.jpg";
    expect(resolveProfileMediaUrl(ref, apiBaseUrl)).toBe(
      "https://api-staging.gogocash.co/user/profile/avatar/stream?ref=local-media%3Aprofile-avatars%2Fuser-1.jpg",
    );
  });

  it("given an opaque stored ref > then returns the trimmed value", () => {
    expect(resolveProfileMediaUrl("  gcs:bucket/key  ", apiBaseUrl)).toBe("gcs:bucket/key");
  });
});
