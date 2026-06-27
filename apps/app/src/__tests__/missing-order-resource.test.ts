import { describe, expect, it, vi, beforeEach } from "vitest";
import { mapBrandCatalogToMissingOrderShops, submitMissingOrder } from "../account/missingOrderResource";

vi.mock("@mobile/api/sharedClient", () => ({
  getSharedMobileApiClient: vi.fn(),
}));

const { getSharedMobileApiClient } = await import("@mobile/api/sharedClient");

describe("mapBrandCatalogToMissingOrderShops", () => {
  it("given live brands > then maps offer ids and appends Other option", () => {
    expect(
      mapBrandCatalogToMissingOrderShops([
        { id: "offer-1", name: "Shopee" },
        { id: "offer-2", name: "Lazada" },
      ]),
    ).toEqual([
      { id: "offer-1", label: "Shopee" },
      { id: "offer-2", label: "Lazada" },
      { id: "other", label: "Other (enter brand name)" },
    ]);
  });
});

describe("submitMissingOrder", () => {
  beforeEach(() => {
    vi.mocked(getSharedMobileApiClient).mockReset();
  });

  it("given a session client > then posts multipart via shared client (401 teardown path)", async () => {
    const postFormData = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(getSharedMobileApiClient).mockResolvedValue({ postFormData } as never);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        blob: vi.fn().mockResolvedValue(new Blob(["receipt"], { type: "image/jpeg" })),
      }),
    );

    await submitMissingOrder({
      amount: "100",
      apiUrl: "https://api.example.com",
      files: [{ name: "receipt.jpg", uri: "blob:receipt" }],
      note: "missing cashback",
      offerId: "offer-1",
      orderId: "ORD-9",
      purchaseDate: "2026-01-15",
    });

    expect(getSharedMobileApiClient).toHaveBeenCalledWith("https://api.example.com");
    expect(postFormData).toHaveBeenCalledWith(
      "/offer/saveMissingOrder",
      expect.any(FormData),
    );
  });

  it("given no session store > then throws before fetch", async () => {
    vi.mocked(getSharedMobileApiClient).mockResolvedValue(null);

    await expect(
      submitMissingOrder({
        amount: "100",
        apiUrl: "https://api.example.com",
        files: [],
        note: "",
        offerId: "offer-1",
        orderId: "ORD-9",
        purchaseDate: "2026-01-15",
      }),
    ).rejects.toThrow("No mobile session store is available.");
  });
});
