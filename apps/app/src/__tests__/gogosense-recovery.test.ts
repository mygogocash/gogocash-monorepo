import { mapGoGoSenseRecoveryJob } from "@mobile/gogosense/useGoGoSenseRecovery";
import { describe, expect, it } from "vitest";

describe("GoGoSense recovery job mapping", () => {
  it("maps backend screenshot jobs into manual recovery state", () => {
    expect(
      mapGoGoSenseRecoveryJob({
        _id: "screenshot-1",
        merchant_id: "merchant-shopee",
        status: "manual_review",
        upload_url: "https://uploads.gogocash.test/screenshot-1",
      }),
    ).toEqual({
      id: "screenshot-1",
      merchantId: "merchant-shopee",
      status: "manual_review",
      uploadUrl: "https://uploads.gogocash.test/screenshot-1",
    });
  });

  it("ignores malformed recovery job payloads", () => {
    expect(mapGoGoSenseRecoveryJob({ status: "pending" })).toBeNull();
    expect(mapGoGoSenseRecoveryJob(null)).toBeNull();
  });
});
