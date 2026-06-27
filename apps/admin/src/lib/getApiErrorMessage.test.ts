import { describe, expect, it } from "vitest";

import { getApiErrorMessage } from "./getApiErrorMessage";

describe("getApiErrorMessage", () => {
  // Regression for #105: apiClient throws a flat ApiError ({ message, status,
  // errors }) — a plain object, not an Error — so the real reason used to be
  // swallowed and every failure showed the generic fallback.
  it("returns the top-level message from a flat ApiError object", () => {
    const apiError = {
      message: "affiliate_tracking_link is required",
      status: 400,
    };
    expect(getApiErrorMessage(apiError, "Could not create brand.")).toBe(
      "affiliate_tracking_link is required",
    );
  });

  it("appends field-level validation errors when present", () => {
    const apiError = {
      message: "Validation failed",
      status: 400,
      errors: {
        brand_name: ["is required"],
        commission: ["must be a number"],
      },
    };
    expect(getApiErrorMessage(apiError)).toBe(
      "Validation failed: is required; must be a number",
    );
  });

  it("still reads the axios response.data.message shape", () => {
    expect(
      getApiErrorMessage({ response: { data: { message: "boom" } } }),
    ).toBe("boom");
  });

  it("still reads the interceptor-rejected data.message shape", () => {
    expect(getApiErrorMessage({ data: { message: "rejected" } })).toBe(
      "rejected",
    );
  });

  it("still reads Error instances", () => {
    expect(getApiErrorMessage(new Error("kaboom"))).toBe("kaboom");
  });

  it("joins validation message arrays from the interceptor-rejected shape", () => {
    expect(
      getApiErrorMessage({
        data: { message: ["start_date must be a string", "status is invalid"] },
      }),
    ).toBe("start_date must be a string, status is invalid");
  });

  it("falls back when there is no usable message", () => {
    expect(getApiErrorMessage({ status: 500 }, "fallback")).toBe("fallback");
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
    expect(getApiErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(getApiErrorMessage({ message: "   " }, "fallback")).toBe("fallback");
    expect(getApiErrorMessage({ message: 42 }, "fallback")).toBe("fallback");
  });
});
