import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchGoLinkPreview,
  hasGoLinkProductPreview,
} from "@mobile/api/golinkPreview";

describe("fetchGoLinkPreview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a successful preview response > then returns OG fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "LA GLACE Pads",
        imageUrl: "https://cdn.example/p.jpg",
        description: "toner",
        price: "290 THB",
      }),
    });

    await expect(
      fetchGoLinkPreview({
        apiUrl: "https://api.example",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        url: "https://s.shopee.co.th/abc",
      }),
    ).resolves.toEqual({
      title: "LA GLACE Pads",
      imageUrl: "https://cdn.example/p.jpg",
      description: "toner",
      price: "290 THB",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example/golink/preview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ url: "https://s.shopee.co.th/abc" }),
      }),
    );
  });

  it("given a network or HTTP failure > then returns empty fields (merchant fallback)", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));
    await expect(
      fetchGoLinkPreview({
        apiUrl: "https://api.example",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        url: "https://s.shopee.co.th/abc",
      }),
    ).resolves.toEqual({
      title: null,
      imageUrl: null,
      description: null,
      price: null,
    });
  });

  it("hasGoLinkProductPreview > given any product field > then true", () => {
    expect(hasGoLinkProductPreview({ title: "x", imageUrl: null, description: null, price: null })).toBe(
      true,
    );
    expect(
      hasGoLinkProductPreview({ title: null, imageUrl: null, description: null, price: null }),
    ).toBe(false);
  });
});
