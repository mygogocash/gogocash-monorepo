import { describe, expect, it } from "vitest";

import {
  buildQuestCampaignFormData,
  nextQuestCampaignRequest,
} from "./questCampaignFormData";

function file(name: string) {
  return new File([name], `${name}.png`, { type: "image/png" });
}

describe("questCampaignFormData", () => {
  it("sends command identity and only multipart File values for all four banners", () => {
    const banners = {
      bannerEn: file("banner-en"),
      bannerTh: file("banner-th"),
      subBannerEn: file("sub-banner-en"),
      subBannerTh: file("sub-banner-th"),
    };

    const form = buildQuestCampaignFormData({
      requestKey: "quest-media:test-command",
      campaignRevision: 4,
      configRevision: 7,
      questId: "quest-1",
      startDate: "2026-07-01T02:30:00.000Z",
      endDate: "2026-07-31T15:15:00.000Z",
      status: "scheduled",
      facebookPage: "",
      facebookPost: "",
      line: "",
      ...banners,
    });

    expect(form.get("request_key")).toBe("quest-media:test-command");
    expect(form.get("campaign_revision")).toBe("4");
    expect(form.get("expected_config_revision")).toBe("7");
    expect(form.get("_id")).toBe("quest-1");
    expect(form.get("banner_en")).toBe(banners.bannerEn);
    expect(form.get("banner_th")).toBe(banners.bannerTh);
    expect(form.get("sub_banner_en")).toBe(banners.subBannerEn);
    expect(form.get("sub_banner_th")).toBe(banners.subBannerTh);
    expect(
      [...form.values()].filter((value) => value instanceof File),
    ).toHaveLength(4);
  });

  it("refuses a legacy string banner instead of serializing it as upload proof", () => {
    expect(() =>
      buildQuestCampaignFormData({
        requestKey: "quest-media:test-command",
        campaignRevision: 0,
        configRevision: 0,
        startDate: "2026-07-01T02:30:00.000Z",
        endDate: "2026-07-31T15:15:00.000Z",
        status: "scheduled",
        facebookPage: "",
        facebookPost: "",
        line: "",
        bannerEn: "https://legacy.example/banner.png" as unknown as File,
        bannerTh: null,
        subBannerEn: null,
        subBannerTh: null,
      }),
    ).toThrow("Banner EN must be a newly selected image file.");
  });

  it("keeps a request key stable for an unchanged draft and rotates it after a change", () => {
    const ids = ["uuid-1", "uuid-2"];
    const first = nextQuestCampaignRequest(null, "fingerprint-a", () =>
      ids.shift()!,
    );
    const retry = nextQuestCampaignRequest(first, "fingerprint-a", () =>
      ids.shift()!,
    );
    const changed = nextQuestCampaignRequest(retry, "fingerprint-b", () =>
      ids.shift()!,
    );

    expect(retry).toBe(first);
    expect(changed.requestKey).not.toBe(first.requestKey);
    expect(changed.fingerprint).toBe("fingerprint-b");
  });
});
