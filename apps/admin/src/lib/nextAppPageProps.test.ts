import { describe, expect, it } from "vitest";

import { awaitPageDynamicProps } from "@/lib/nextAppPageProps";

describe("awaitPageDynamicProps", () => {
  it("awaits params but NOT searchParams (fixes the static->dynamic 500 on generateStaticParams routes)", async () => {
    // Regression guard for the Quest edit 500 (2026-07-22): awaiting `searchParams` on a
    // route that also declares generateStaticParams throws Next's "Page changed from static
    // to dynamic at runtime". The helper must await `params` and leave `searchParams` alone.
    let paramsAwaited = false;
    const params = Promise.resolve().then(() => {
      paramsAwaited = true;
      return { questId: "abc" };
    });
    // If the helper awaited this, the rejection would surface and fail the assertion.
    const searchParams = Promise.reject(new Error("searchParams must NOT be awaited"));
    searchParams.catch(() => {}); // suppress unhandled-rejection noise

    await expect(
      awaitPageDynamicProps({ params, searchParams }),
    ).resolves.toBeUndefined();
    expect(paramsAwaited).toBe(true);
  });
});
