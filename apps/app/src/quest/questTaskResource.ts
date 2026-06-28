import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@mobile/api/client";
import { getMobileEnv } from "@mobile/config/env";
import { webQuestTaskRows } from "@mobile/design/webDesignParity";
import { useLocale } from "@mobile/i18n/LocaleProvider";

import {
  mapBackendQuestTasks,
  questTaskEndpoint,
  type QuestTaskRow,
} from "./questTaskMapper";

export { mapBackendQuestTasks, questTaskEndpoint };
export type { QuestTaskRow };

export type QuestTaskResourceStatus = "error" | "loading" | "ready";

export type QuestTaskResourceResult = {
  error: Error | null;
  retry: () => void;
  rows: QuestTaskRow[];
  status: QuestTaskResourceStatus;
};

export const fixtureQuestTaskRows: QuestTaskRow[] = webQuestTaskRows.map((task) => ({
  icon: task.icon,
  key: task.title,
  points: task.points,
  title: task.title,
}));

export function useQuestTaskRows(): QuestTaskResourceResult {
  const env = useMemo(() => getMobileEnv(), []);
  const { locale } = useLocale();
  const shouldFetchBackend = env.accountDataSource === "backend";
  const query = useQuery<unknown, Error>({
    enabled: shouldFetchBackend,
    queryFn: () => fetchQuestTaskPayload(env.apiUrl),
    queryKey: ["quest-task-rows", env.apiUrl, questTaskEndpoint, locale],
    retry: false,
  });

  const retry = () => {
    if (shouldFetchBackend) {
      void query.refetch();
    }
  };

  if (!shouldFetchBackend) {
    return { error: null, retry, rows: fixtureQuestTaskRows, status: "ready" };
  }

  if (query.isPending) {
    return { error: null, retry, rows: [], status: "loading" };
  }

  if (query.isError) {
    return { error: query.error, retry, rows: [], status: "error" };
  }

  return {
    error: null,
    retry,
    rows: mapBackendQuestTasks(query.data, [], locale),
    status: "ready",
  };
}

export async function fetchQuestTaskPayload(
  apiUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<unknown> {
  const response = await fetchImpl(`${apiUrl.replace(/\/+$/, "")}${questTaskEndpoint}`, {
    headers: { Accept: "application/json" },
    method: "GET",
  });
  const text = await response.text();
  const body = text ? parseJson(text) : null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return body;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
