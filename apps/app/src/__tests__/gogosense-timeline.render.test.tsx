import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGoGoSenseTimeline } from "@mobile/gogosense/useGoGoSenseTimeline";

describe("useGoGoSenseTimeline (render)", () => {
  it("maps api detections into timeline entries", async () => {
    const api = {
      getTimeline: vi.fn(async () => ({
        detections: [
          { _id: "d1", merchant_name: "Shopee", matched: true, observed_at: "2026-05-23" },
        ],
        activations: [],
      })),
    };

    const { result } = renderHook(() => useGoGoSenseTimeline(api));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual([
      { id: "d1", title: "Shopee", body: "2026-05-23", status: "Matched" },
    ]);
  });

  it("returns null off-device (no api) so the screen keeps its static fallback", () => {
    const { result } = renderHook(() => useGoGoSenseTimeline(null));

    expect(result.current).toBeNull();
  });
});
