import { describe, expect, it } from "vitest";

import {
  multipartAuthHeaders,
  MULTIPART_UPLOAD_TIMEOUT_MS,
  multipartPostConfig,
  stripDefaultJsonContentTypeForFormData,
} from "./multipartFormHeaders";

describe("multipartAuthHeaders", () => {
  it("given an access token > then returns Authorization without Content-Type", () => {
    expect(multipartAuthHeaders("token-123")).toEqual({
      Authorization: "Bearer token-123",
    });
    expect(multipartAuthHeaders("token-123")).not.toHaveProperty("Content-Type");
  });

  it("given no token > then returns empty headers", () => {
    expect(multipartAuthHeaders(null)).toEqual({});
    expect(multipartAuthHeaders(undefined)).toEqual({});
  });
});

describe("multipartPostConfig", () => {
  it("given an access token > then returns auth headers only", () => {
    expect(multipartPostConfig("token-123")).toEqual({
      timeout: MULTIPART_UPLOAD_TIMEOUT_MS,
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("given extra config > then merges timeout override and headers", () => {
    expect(
      multipartPostConfig("token-123", { timeout: 30_000, headers: { "X-Test": "1" } }),
    ).toEqual({
      timeout: 30_000,
      headers: {
        "X-Test": "1",
        Authorization: "Bearer token-123",
      },
    });
  });
});

describe("stripDefaultJsonContentTypeForFormData", () => {
  it("given FormData payload > then removes default JSON Content-Type headers", () => {
    const headers: Record<string, unknown> = {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    };
    const formData = new FormData();
    formData.append("image_1", new File(["x"], "banner.png", { type: "image/png" }));

    stripDefaultJsonContentTypeForFormData(headers, formData);

    expect(headers).toEqual({ Authorization: "Bearer token" });
    expect(headers).not.toHaveProperty("Content-Type");
    expect(headers).not.toHaveProperty("content-type");
  });

  it("given non-FormData payload > then leaves headers unchanged", () => {
    const headers = { "Content-Type": "application/json" };

    stripDefaultJsonContentTypeForFormData(headers, { link_1: "/promo" });

    expect(headers).toEqual({ "Content-Type": "application/json" });
  });
});
