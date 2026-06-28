import { useEffect, useState } from "react";

import { useGoGoTrackApi } from "./useGoGoTrackApi";

export type GoGoTrackTimelineEntry = {
  id: string;
  title: string;
  body: string;
  status: string;
};

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
 * Loads the GoGoTrack detection timeline from the authed api. Returns `null`
 * until loaded (and off-device, where the api is null) so the screen can fall
 * back to its static example rows. `apiOverride` is the test seam.
 */
export function useGoGoTrackTimeline(
  apiOverride?: TimelineApi | null,
): GoGoTrackTimelineEntry[] | null {
  const liveApi = useGoGoTrackApi();
  const api = apiOverride ?? liveApi;
  const [entries, setEntries] = useState<GoGoTrackTimelineEntry[] | null>(null);

  useEffect(() => {
    if (!api) {
      return;
    }
    let active = true;
    void api
      .getTimeline()
      .then((data) => {
        if (active) {
          setEntries(mapTimeline(data));
        }
      })
      .catch(() => {
        // Read-only timeline: on failure keep the static fallback.
      });
    return () => {
      active = false;
    };
  }, [api]);

  return entries;
}
