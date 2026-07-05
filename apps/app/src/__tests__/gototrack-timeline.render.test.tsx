import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGoGoTrackTimeline } from "@mobile/gototrack/useGoGoTrackTimeline";

describe("useGoGoTrackTimeline (render)", () => {
  it("maps api detections into timeline entries", async () => {
    const api = {
      getTimeline: vi.fn(async () => ({
        detections: [
          { _id: "d1", merchant_name: "Shopee", matched: true, observed_at: "2026-05-23" },
        ],
        activations: [],
      })),
    };

    const { result } = renderHook(() => useGoGoTrackTimeline(api));

    await waitFor(() => expect(result.current.kind).toBe("ready"));
    if (result.current.kind === "ready") {
      expect(result.current.entries).toEqual([
        { id: "d1", title: "Shopee", body: "2026-05-23", status: "Matched" },
      ]);
    }
  });

  it("returns idle off-device (no api)", () => {
    const { result } = renderHook(() => useGoGoTrackTimeline(null));

    expect(result.current).toEqual({ kind: "idle" });
  });

  it("returns ready with empty entries when api returns no detections", async () => {
    const api = {
      getTimeline: vi.fn(async () => ({ detections: [], activations: [] })),
    };

    const { result } = renderHook(() => useGoGoTrackTimeline(api));

    await waitFor(() => expect(result.current.kind).toBe("ready"));
    if (result.current.kind === "ready") {
      expect(result.current.entries).toEqual([]);
    }
  });
});
