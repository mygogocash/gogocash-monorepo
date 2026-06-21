import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@mobile/api/client";
import { getMobileEnv } from "@mobile/config/env";
import { webQuestTaskRows } from "@mobile/design/webDesignParity";

export const questTaskEndpoint = "/offer/extra-point";

type FixtureQuestTask = (typeof webQuestTaskRows)[number];

export type QuestTaskRow = {
  href?: string;
  icon: FixtureQuestTask["icon"];
  key: string;
  logoUri?: string;
  points: string;
  title: string;
};

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

type BackendQuestTaskOffer = {
  _id?: unknown;
  disabled?: unknown;
  extra_point?: unknown;
  logo?: unknown;
  logo_circle?: unknown;
  offer_id?: unknown;
  offer_name?: unknown;
  offer_name_display?: unknown;
  quest_task_sort_order?: unknown;
  quest_task_wording?: unknown;
  status?: unknown;
};

export function useQuestTaskRows(): QuestTaskResourceResult {
  const env = useMemo(() => getMobileEnv(), []);
  const shouldFetchBackend = env.accountDataSource === "backend";
  const query = useQuery<unknown, Error>({
    enabled: shouldFetchBackend,
    queryFn: () => fetchQuestTaskPayload(env.apiUrl),
    queryKey: ["quest-task-rows", env.apiUrl, questTaskEndpoint],
    retry: false,
    staleTime: 1000 * 60,
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
    rows: mapBackendQuestTasks(query.data),
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

export function mapBackendQuestTasks(
  payload: unknown,
  fallbackRows: QuestTaskRow[] = []
): QuestTaskRow[] {
  if (!Array.isArray(payload)) {
    return fallbackRows;
  }

  const rows = payload
    .map((raw, index) => mapBackendQuestTask(raw, index))
    .filter((row): row is QuestTaskRow & { sortOrder: number } => row !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _sortOrder, ...row }) => row);

  return rows;
}

function mapBackendQuestTask(
  raw: unknown,
  index: number
): (QuestTaskRow & { sortOrder: number }) | null {
  if (!isRecord(raw)) {
    return null;
  }

  const task = raw as BackendQuestTaskOffer;
  if (task.disabled === true || task.status === "pending_review" || task.status === "rejected") {
    return null;
  }

  const title = firstText(task.quest_task_wording, task.offer_name_display, task.offer_name);
  if (!title) {
    return null;
  }

  const key = firstText(task._id, task.offer_id) ?? `quest-task-${index}`;
  const offerPathId = firstText(task._id, task.offer_id);
  const logoUri = firstText(task.logo_circle, task.logo);

  return {
    href: offerPathId ? `/shop/${encodeURIComponent(offerPathId)}` : undefined,
    icon: "go",
    key,
    logoUri,
    points: formatQuestPoints(task.extra_point),
    sortOrder: toFiniteNumber(task.quest_task_sort_order) ?? index,
    title,
  };
}

function formatQuestPoints(value: unknown): string {
  const points = toFiniteNumber(value);
  return `+${points == null ? 0 : Math.trunc(points)} Points`;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
