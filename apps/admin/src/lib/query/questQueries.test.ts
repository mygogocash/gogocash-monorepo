import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/axios/client", () => ({
  default: mockClient,
}));

import { MULTIPART_UPLOAD_TIMEOUT_MS } from "@/lib/multipartFormHeaders";
import { saveQuestCampaign } from "./questQueries";

describe("saveQuestCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new quest through the create endpoint with safe multipart config", async () => {
    const formData = new FormData();
    formData.append("request_key", "quest-media:create-request");
    const created = { _id: "quest-created" };
    mockClient.post.mockResolvedValueOnce({ data: created });

    await expect(saveQuestCampaign(formData)).resolves.toBe(created);

    expect(mockClient.post).toHaveBeenCalledWith(
      "/point/create-quest",
      formData,
      {
        timeout: MULTIPART_UPLOAD_TIMEOUT_MS,
        headers: {},
      },
    );
    expect(mockClient.patch).not.toHaveBeenCalled();
  });

  it("updates an existing quest through the campaign endpoint and preserves all banner files (#636)", async () => {
    const formData = new FormData();
    const banners = {
      banner_en: new File(["banner-en"], "banner-en.png", {
        type: "image/png",
      }),
      banner_th: new File(["banner-th"], "banner-th.png", {
        type: "image/png",
      }),
      sub_banner_en: new File(["sub-banner-en"], "sub-banner-en.png", {
        type: "image/png",
      }),
      sub_banner_th: new File(["sub-banner-th"], "sub-banner-th.png", {
        type: "image/png",
      }),
    };
    formData.append("_id", "quest-636");
    Object.entries(banners).forEach(([field, file]) =>
      formData.append(field, file),
    );
    const updated = { _id: "quest-636", campaign_revision: 4 };
    mockClient.patch.mockResolvedValueOnce({ data: updated });

    await expect(saveQuestCampaign(formData)).resolves.toBe(updated);

    expect(formData.get("_id")).toBeNull();
    expect(formData.get("banner_en")).toBe(banners.banner_en);
    expect(formData.get("banner_th")).toBe(banners.banner_th);
    expect(formData.get("sub_banner_en")).toBe(banners.sub_banner_en);
    expect(formData.get("sub_banner_th")).toBe(banners.sub_banner_th);
    expect(mockClient.patch).toHaveBeenCalledWith(
      "/point/admin-quest/quest-636/campaign",
      formData,
      {
        timeout: MULTIPART_UPLOAD_TIMEOUT_MS,
        headers: {},
      },
    );
    expect(mockClient.post).not.toHaveBeenCalled();
  });
});
