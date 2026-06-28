import { mapGoGoTrackRecoveryJob } from "@mobile/gototrack/useGoGoTrackRecovery";
import { describe, expect, it } from "vitest";

describe("GoGoTrack recovery job mapping", () => {
  it("maps backend screenshot jobs into manual recovery state", () => {
    expect(
      mapGoGoTrackRecoveryJob({
        _id: "screenshot-1",
        merchant_id: "merchant-shopee",
        status: "manual_review",
        upload_url: "https://uploads.gogocash.test/screenshot-1",
        expires_at: "2026-05-24T09:00:00.000Z",
      }),
    ).toEqual({
      id: "screenshot-1",
      merchantId: "merchant-shopee",
      status: "manual_review",
      uploadUrl: "https://uploads.gogocash.test/screenshot-1",
      expiresAt: "2026-05-24T09:00:00.000Z",
    });
  });

  it("ignores malformed recovery job payloads", () => {
    expect(mapGoGoTrackRecoveryJob({ status: "pending" })).toBeNull();
    expect(mapGoGoTrackRecoveryJob(null)).toBeNull();
  });
});
