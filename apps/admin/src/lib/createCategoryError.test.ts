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

  it("given a response without a message > then uses the plain actionable fallback (never the HTTP status)", () => {
    const fallback =
      "Couldn't create the category. Please try again, or contact an administrator if it continues.";
    expect(createCategoryErrorMessage({ status: 502, data: "" })).toBe(fallback);
    expect(createCategoryErrorMessage({ status: 502, data: "" })).not.toContain(
      "502",
    );
  });

  it("given a shapeless error > then falls back to the plain actionable message", () => {
    expect(createCategoryErrorMessage({})).toBe(
      "Couldn't create the category. Please try again, or contact an administrator if it continues.",
    );
  });

  it("given a transport Error > then surfaces its message", () => {
    expect(
      createCategoryErrorMessage(
        new Error("Couldn't reach the server. Check your connection and try again."),
      ),
    ).toBe("Couldn't reach the server. Check your connection and try again.");
  });
});
