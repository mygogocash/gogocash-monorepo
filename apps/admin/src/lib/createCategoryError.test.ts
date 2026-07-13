import { describe, expect, it } from "vitest";

import { createCategoryErrorMessage } from "./createCategoryError";

// The axios client's response interceptor rejects with `error.response`
// (`{ status, data, ... }`), so the API message lives at `err.data.message`
// and the HTTP status at `err.status`.
describe("createCategoryErrorMessage", () => {
  it("given an API error message > then surfaces it verbatim", () => {
    expect(
      createCategoryErrorMessage({
        status: 400,
        data: { message: 'A category named "Fashion" already exists' },
      }),
    ).toBe('A category named "Fashion" already exists');
  });

  it("given a response without a message > then includes the HTTP status in the fallback", () => {
    expect(createCategoryErrorMessage({ status: 502, data: "" })).toBe(
      "Failed to create category (HTTP 502).",
    );
  });

  it("given a shapeless error > then falls back to the generic message", () => {
    expect(createCategoryErrorMessage({})).toBe("Failed to create category.");
  });

  it("given a transport Error > then surfaces its message", () => {
    expect(createCategoryErrorMessage(new Error("No response from server"))).toBe(
      "No response from server",
    );
  });
});
