import { describe, expect, it } from "vitest";

import {
  buildGoGoTrackActivateDeepLink,
  parseGoGoTrackActivateDeepLink,
} from "@mobile/gototrack/promptDeepLink";

describe("GoGoTrack activate deep link", () => {
  it("round-trips activation payload through gogocash://gototrack/activate", () => {
    const payload = {
      packageName: "com.shopee.th",
      detectionEventId: "det-1",
      merchantId: "shopee",
      merchantName: "Shopee",
      offerId: 101,
      networkMerchantId: 201,
    };

    const url = buildGoGoTrackActivateDeepLink(payload);
    expect(url).toContain("gogocash://gototrack/activate");
    expect(parseGoGoTrackActivateDeepLink(url)).toEqual(payload);
  });
});
