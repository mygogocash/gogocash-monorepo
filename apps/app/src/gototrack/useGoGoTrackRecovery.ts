import { useCallback, useState } from "react";

import { useGoGoTrackApi } from "./useGoGoTrackApi";

export type GoGoTrackRecoveryJob = {
  id: string;
  status: "pending" | "processing" | "matched" | "manual_review" | "failed" | string;
  uploadUrl?: string;
  expiresAt?: string;
  merchantId?: string;
};

export type GoGoTrackRecoveryApi = {
  createScreenshotJob(): Promise<unknown>;
  getScreenshotJob?(id: string): Promise<unknown>;
};

type RecoveryApi = GoGoTrackRecoveryApi;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pick(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function mapGoGoTrackRecoveryJob(data: unknown): GoGoTrackRecoveryJob | null {
  const record = asRecord(data);
  if (!record) {
    return null;
  }

  const id = asString(pick(record, "id", "_id", "screenshotJobId", "screenshot_job_id"));
  if (!id) {
    return null;
  }

  return {
    id,
    status: asString(pick(record, "status")) ?? "pending",
    uploadUrl: asString(pick(record, "uploadUrl", "upload_url")),
    expiresAt: asString(pick(record, "expiresAt", "expires_at")),
    merchantId: asString(pick(record, "merchantId", "merchant_id")),
  };
}

export function useGoGoTrackRecovery(apiOverride?: RecoveryApi | null) {
  const defaultApi = useGoGoTrackApi();
  const api = apiOverride === undefined ? defaultApi : apiOverride;
  const [job, setJob] = useState<GoGoTrackRecoveryJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRecovery = useCallback(async () => {
    if (!api || loading) {
      return null;
    }

    setLoading(true);
    setError(null);
    setJob(null);
    try {
      const created = mapGoGoTrackRecoveryJob(await api.createScreenshotJob());
      const refreshed =
        created?.id && api.getScreenshotJob
          ? mapGoGoTrackRecoveryJob(await api.getScreenshotJob(created.id)) ?? created
          : created;
      setJob(refreshed);
      return refreshed;
    } catch {
      setError("Recovery job could not be started. Try again from GoGoTrack timeline.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, loading]);

  return {
    available: Boolean(api),
    error,
    job,
    loading,
    startRecovery,
  };
}
