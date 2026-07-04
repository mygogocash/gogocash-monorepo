import { useEffect, useState } from "react";

import { useGoGoTrackApi } from "./useGoGoTrackApi";

export type GoGoTrackTimelineEntry = {
  id: string;
  title: string;
  body: string;
  status: string;
};

export type GoGoTrackTimelineView =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; entries: GoGoTrackTimelineEntry[] }
  | { kind: "error" };

type TimelineApi = {
  getTimeline(): Promise<unknown>;
};

type RawDetection = {
  _id?: string;
  merchant_name?: string;
  package_name?: string;
  observed_at?: string;
  matched?: boolean;
};

function mapTimeline(data: unknown): GoGoTrackTimelineEntry[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const detections = (data as { detections?: unknown }).detections;
  if (!Array.isArray(detections)) {
    return [];
  }
  return (detections as RawDetection[]).map((detection, index) => ({
    id: detection._id ?? String(index),
    title: detection.merchant_name ?? detection.package_name ?? "Detected session",
    body: detection.observed_at ?? "",
    status: detection.matched ? "Matched" : "Seen",
  }));
}

/**
 * Loads the GoGoTrack detection timeline from the authed api. Distinguishes
 * loading, empty, and error so screens never treat `[]` as “still loading”.
 * `apiOverride` is the test seam.
 */
export function useGoGoTrackTimeline(
  apiOverride?: TimelineApi | null,
): GoGoTrackTimelineView {
  const liveApi = useGoGoTrackApi();
  const api = apiOverride ?? liveApi;
  const [view, setView] = useState<GoGoTrackTimelineView>(() =>
    api ? { kind: "loading" } : { kind: "idle" },
  );

  useEffect(() => {
    if (!api) {
      setView({ kind: "idle" });
      return;
    }

    let active = true;
    setView({ kind: "loading" });
    void api
      .getTimeline()
      .then((data) => {
        if (active) {
          setView({ kind: "ready", entries: mapTimeline(data) });
        }
      })
      .catch(() => {
        if (active) {
          setView({ kind: "error" });
        }
      });
    return () => {
      active = false;
    };
  }, [api]);

  return view;
}
