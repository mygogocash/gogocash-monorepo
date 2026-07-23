import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mapBrandCatalogToMissingOrderShops,
  submitMissingOrder,
} from "../account/missingOrderResource";
import * as missingOrderResource from "../account/missingOrderResource";
import { ApiError } from "../api/client";

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

  it("given metadata only > then posts multipart via shared client (401 teardown path)", async () => {
    const postFormData = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(getSharedMobileApiClient).mockResolvedValue({
      postFormData,
    } as never);

    await submitMissingOrder({
      amount: "100",
      apiUrl: "https://api.example.com",
      files: [],
      note: "missing cashback",
      offerId: "offer-1",
      orderId: "ORD-9",
      purchaseDate: "2026-01-15",
    });

    expect(getSharedMobileApiClient).toHaveBeenCalledWith(
      "https://api.example.com",
    );
    expect(postFormData).toHaveBeenCalledWith(
      "/offer/saveMissingOrder",
      expect.any(FormData),
    );
  });

  it("given evidence > then fails closed before session or file network I/O with exact API-compatible copy", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const caught = await submitMissingOrder({
      amount: "100",
      apiUrl: "https://api.example.com",
      files: [{ name: "receipt.jpg", uri: "blob:receipt" }],
      note: "missing cashback",
      offerId: "offer-1",
      orderId: "ORD-9",
      purchaseDate: "2026-01-15",
    }).catch((error) => error);

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({
      status: 503,
      message:
        "Secure evidence uploads are temporarily unavailable. Submit this claim without attachments.",
    });
    expect(missingOrderResource.formatMissingOrderApiError(caught)).toBe(
      "HTTP 503: Secure evidence uploads are temporarily unavailable. Submit this claim without attachments.",
    );
    expect(getSharedMobileApiClient).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
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

describe("canonical missing-order resource contract", () => {
  beforeEach(() => {
    vi.mocked(getSharedMobileApiClient).mockReset();
  });

  it("exports customer list and exact API error helpers", () => {
    expect(typeof missingOrderResource.listMissingOrders).toBe("function");
    expect(typeof missingOrderResource.formatMissingOrderApiError).toBe(
      "function",
    );
  });

  it.each([
    ["pending", "Pending"],
    ["under_review", "Under review"],
    ["approved", "Approved"],
    ["rejected", "Rejected"],
  ] as const)(
    "formats %s as the customer-visible workflow status",
    (status, label) => {
      expect(typeof missingOrderResource.formatMissingOrderStatus).toBe(
        "function",
      );
      expect(missingOrderResource.formatMissingOrderStatus(status)).toBe(label);
    },
  );

  it("lists canonical claims without injecting fallback rows into an empty response", async () => {
    const post = vi.fn().mockResolvedValue({
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    vi.mocked(getSharedMobileApiClient).mockResolvedValue({ post } as never);

    await expect(
      missingOrderResource.listMissingOrders({
        apiUrl: "https://api.example.com",
        page: 1,
        limit: 10,
        search: "ORDER-9",
      }),
    ).resolves.toEqual({
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    expect(post).toHaveBeenCalledWith("/offer/missing-order", {
      page: 1,
      limit: 10,
      search: "ORDER-9",
    });
  });

  it("preserves a specific API failure and formats its exact status and detail", async () => {
    const failure = new ApiError("Evidence reference is required", 422);
    const post = vi.fn().mockRejectedValue(failure);
    vi.mocked(getSharedMobileApiClient).mockResolvedValue({ post } as never);

    const caught = await missingOrderResource
      .listMissingOrders({
        apiUrl: "https://api.example.com",
        page: 1,
        limit: 10,
      })
      .catch((error) => error);

    expect(caught).toBe(failure);
    expect(missingOrderResource.formatMissingOrderApiError(caught)).toBe(
      "HTTP 422: Evidence reference is required",
    );
  });
});
