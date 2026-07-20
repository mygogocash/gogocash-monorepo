import { describe, expect, it } from "vitest";

import {
  friendlyStatusMessage,
  getApiErrorMessage,
} from "./getApiErrorMessage";

describe("friendlyStatusMessage", () => {
  // Status-aware copy for the bare-status fallback — never leaks the numeric
  // code, always states the problem in user terms plus a next action.
  it("given 401 > then asks the user to sign in again", () => {
    expect(friendlyStatusMessage(401)).toBe(
      "Your session has expired. Please sign in again.",
    );
  });

  it("given 403 > then explains missing permission and to ask an administrator", () => {
    expect(friendlyStatusMessage(403)).toBe(
      "You don't have permission to do that. Ask an administrator if you need access.",
    );
  });

  it("given 404 > then asks the user to refresh and try again", () => {
    expect(friendlyStatusMessage(404)).toBe(
      "That wasn't found. Please refresh and try again.",
    );
  });

  it("given 408 or 429 > then asks the user to wait a moment", () => {
    expect(friendlyStatusMessage(408)).toBe(
      "Please wait a moment and try again.",
    );
    expect(friendlyStatusMessage(429)).toBe(
      "Please wait a moment and try again.",
    );
  });

  it("given a 5xx or unknown status > then falls back to the generic actionable line", () => {
    const expected =
      "Something went wrong. Please try again, or contact an administrator if it continues.";
    expect(friendlyStatusMessage(500)).toBe(expected);
    expect(friendlyStatusMessage(502)).toBe(expected);
    expect(friendlyStatusMessage(undefined)).toBe(expected);
    expect(friendlyStatusMessage(0)).toBe(expected);
  });

  it("never exposes the raw HTTP status number to the user", () => {
    for (const status of [401, 403, 404, 408, 429, 500, 503]) {
      expect(friendlyStatusMessage(status)).not.toContain(String(status));
    }
  });
});

describe("getApiErrorMessage", () => {
  it("given no message and no explicit fallback > then appends the next action to the default", () => {
    expect(getApiErrorMessage(null)).toBe(
      "Something went wrong. Please try again, or contact an administrator if it continues.",
    );
  });

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

  it("appends Nest structured reason for policy transaction/integrity 503s (#407)", () => {
    expect(
      getApiErrorMessage({
        response: {
          data: {
            statusCode: 503,
            code: "POLICY_TRANSACTIONS_UNSUPPORTED",
            message:
              "Policy aggregate saves require MongoDB replica set or mongos transaction support.",
            reason: "Durable migration marker is absent or stale",
            topology: "replica-set",
          },
        },
      }),
    ).toBe(
      "Policy aggregate saves require MongoDB replica set or mongos transaction support. (Durable migration marker is absent or stale)",
    );
  });

  it("does not duplicate reason when it is already embedded in message", () => {
    expect(
      getApiErrorMessage({
        data: {
          code: "POLICY_CATEGORY_INTEGRITY_NOT_READY",
          message: "Unavailable (Durable migration marker is absent or stale)",
          reason: "Durable migration marker is absent or stale",
        },
      }),
    ).toBe("Unavailable (Durable migration marker is absent or stale)");
  });

  it("still reads the interceptor-rejected data.message shape", () => {
    expect(getApiErrorMessage({ data: { message: "rejected" } })).toBe(
      "rejected",
    );
  });

  it("still reads Error instances", () => {
    expect(getApiErrorMessage(new Error("kaboom"))).toBe("kaboom");
  });

  it("appends Nest reason from flat apiClient ApiError (#407)", () => {
    const apiError = Object.assign(
      new Error(
        "Policy aggregate saves require MongoDB replica set or mongos transaction support.",
      ),
      {
        status: 503,
        code: "POLICY_TRANSACTIONS_UNSUPPORTED",
        reason: "MongoDB is not a replica set or mongos",
      },
    );
    expect(getApiErrorMessage(apiError)).toBe(
      "Policy aggregate saves require MongoDB replica set or mongos transaction support. (MongoDB is not a replica set or mongos)",
    );
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

  it("#487 maps Multipart: Unexpected end of form to an actionable upload message", () => {
    expect(
      getApiErrorMessage({
        response: { data: { message: "Multipart: Unexpected end of form" } },
      }),
    ).toMatch(/under 32 MB/i);
    expect(
      getApiErrorMessage(new Error("Multipart: Unexpected end of form")),
    ).toMatch(/compress the image/i);
  });
});
