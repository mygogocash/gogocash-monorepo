import { afterEach, describe, expect, it, vi } from "vitest";

import { devApiError } from "./devConsole";

describe("devApiError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("logs the normalized API message for interceptor-rejected responses", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = { data: { message: "Media upload failed" }, status: 503 };

    devApiError("Banner update failed:", err, "Update failed");

    expect(spy).toHaveBeenCalledWith(
      "Banner update failed:",
      "Media upload failed",
      err,
    );
  });
});
