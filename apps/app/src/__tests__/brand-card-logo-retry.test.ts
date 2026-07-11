import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  LOGO_MAX_LOAD_ATTEMPTS,
  LOGO_RETRY_DELAY_MS,
  shouldScheduleLogoRetry,
} from "@mobile/components/logoRetryPolicy";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const brandCardSource = fs.readFileSync(
  path.resolve(testDir, "../components/BrandLogoTile.tsx"),
  "utf8",
);

// Field bug 2026-07-11: a single transient logo failure (media host's
// Cloudflare hotlink/bot layer can 403 sporadically) pinned the tinted
// "KP" initials placeholder for the whole session. Failed logos now retry
// a bounded number of times with a short backoff.
describe("logo retry policy", () => {
  it("given the first and second failures > then a retry is scheduled", () => {
    expect(shouldScheduleLogoRetry(1)).toBe(true);
    expect(shouldScheduleLogoRetry(2)).toBe(true);
  });

  it("given attempts are exhausted > then the placeholder sticks (no retry loop)", () => {
    expect(shouldScheduleLogoRetry(LOGO_MAX_LOAD_ATTEMPTS)).toBe(false);
    expect(shouldScheduleLogoRetry(LOGO_MAX_LOAD_ATTEMPTS + 5)).toBe(false);
  });

  it("given the backoff constants > then they bound a sane retry window", () => {
    // 3 total attempts a few seconds apart — enough to ride out a blip
    // without hammering a genuinely missing image.
    expect(LOGO_MAX_LOAD_ATTEMPTS).toBe(3);
    expect(LOGO_RETRY_DELAY_MS).toBeGreaterThanOrEqual(2000);
    expect(LOGO_RETRY_DELAY_MS).toBeLessThanOrEqual(10000);
  });
});

describe("BrandLogoTile logo retry wiring (source parity)", () => {
  it("given a logo error > then the tile schedules a bounded retry and cleans the timer up", () => {
    expect(brandCardSource).toContain("shouldScheduleLogoRetry(");
    expect(brandCardSource).toContain("LOGO_RETRY_DELAY_MS");
    expect(brandCardSource).toContain("setLogoFailed(false)");
    // The pending retry timer must not fire into an unmounted card or a
    // card whose logo source changed.
    expect(brandCardSource).toContain("clearTimeout(");
  });
});
