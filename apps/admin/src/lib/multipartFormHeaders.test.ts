import { describe, expect, it } from "vitest";

import { multipartAuthHeaders } from "./multipartFormHeaders";

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
