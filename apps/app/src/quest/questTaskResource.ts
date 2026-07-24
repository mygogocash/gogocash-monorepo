import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { getMobileEnv } from "@mobile/config/env";
import { webQuestTaskRows } from "@mobile/design/webDesignParity";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import type { Locale } from "@mobile/i18n/locales";

import {
  mapQuestTaskCatalog,
  questTaskCatalogEndpoint,
  type MappedQuestTaskCatalog,
  type QuestTaskCatalogSource,
} from "./questTaskCatalogMapper";
import {
  mapBackendQuestTasks,
  questTaskEndpoint,
  type QuestTaskRow,
} from "./questTaskMapper";

export {
  mapBackendQuestTasks,
  mapQuestTaskCatalog,
  questTaskCatalogEndpoint,
  questTaskEndpoint,
};
export type { QuestTaskRow };

export type QuestTaskResourceStatus = "error" | "loading" | "ready";

export type QuestTaskResourceResult = {
  error: Error | null;
  retry: () => void;
  rows: QuestTaskRow[];
  status: QuestTaskResourceStatus;
};

export type QuestTaskCatalogResourceResult = QuestTaskResourceResult & {
  catalogSource: QuestTaskCatalogSource | null;
  configRevision: number | null;
  questId: string | null;
};

type QuestTaskBaseClient = {
  get(path: string): Promise<unknown>;
};

export const fixtureQuestTaskRows: QuestTaskRow[] = webQuestTaskRows.map(
  (task) => ({
    current: 0,
    icon: task.icon,
    key: `fixture:${task.title}`,
    points: task.points,
    progressLabel: "0 / 1 purchase",
    questId: "fixture",
    state: "not_started",
    stateLabel: "Not started",
    target: 1,
    taskKey: task.title,
    taskType: "brand_purchase",
    title: task.title,
    unit: "purchase",
  }),
);

export const fixtureQuestTaskCatalogRows: QuestTaskRow[] =
  fixtureQuestTaskRows.map((task) => ({
    ...task,
    progressLabel: "",
    stateLabel: "",
  }));

export function questTaskQueryKey(
  apiUrl: string,
  sessionScope: string,
  locale: Locale,
) {
  return [
    "quest-task-progress",
    apiUrl,
    questTaskEndpoint,
    sessionScope,
    locale,
  ] as const;
}

export function questTaskCatalogQueryKey(apiUrl: string, locale: Locale) {
  return [
    "quest-task-catalog",
    apiUrl,
    questTaskCatalogEndpoint,
    locale,
  ] as const;
}

export function useQuestTaskRows(): QuestTaskResourceResult {
  const env = useMemo(() => getMobileEnv(), []);
  const { locale } = useLocale();
  const auth = useAuthGuardSession();
  const session = useMobileSessionSnapshot();
  const shouldFetchBackend = env.accountDataSource === "backend";
  const sessionScope =
    typeof session?._id === "string" && session._id
      ? session._id
      : typeof session?.access_token === "string" && session.access_token
        ? `token:${session.access_token}`
        : "anon";
  const query = useQuery<unknown, Error>({
    enabled: shouldFetchBackend && auth.ready && auth.isAuthed,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client)
        throw new Error("Quest progress session store is unavailable.");
      return fetchQuestTaskPayload(client);
    },
    queryKey: questTaskQueryKey(env.apiUrl, sessionScope, locale),
    retry: false,
  });

  const retry = () => {
    if (shouldFetchBackend && auth.isAuthed) void query.refetch();
  };

  if (!shouldFetchBackend) {
    return { error: null, retry, rows: fixtureQuestTaskRows, status: "ready" };
  }
  if (!auth.ready) {
    return { error: null, retry, rows: [], status: "loading" };
  }
  if (!auth.isAuthed) {
    return { error: null, retry, rows: [], status: "ready" };
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

export function useQuestTaskCatalog(): QuestTaskCatalogResourceResult {
  const env = useMemo(() => getMobileEnv(), []);
  const { locale } = useLocale();
  const shouldFetchBackend = env.accountDataSource === "backend";
  const query = useQuery<MappedQuestTaskCatalog, Error>({
    enabled: shouldFetchBackend,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client)
        throw new Error("Quest task catalog session store is unavailable.");
      const payload = await fetchQuestTaskCatalogPayload(client);
      const catalog = mapQuestTaskCatalog(payload, locale);
      if (!catalog) {
        throw new Error("Quest task catalog response is invalid.");
      }
      return catalog;
    },
    queryKey: questTaskCatalogQueryKey(env.apiUrl, locale),
    retry: false,
  });

  const retry = () => {
    if (shouldFetchBackend) void query.refetch();
  };

  if (!shouldFetchBackend) {
    return {
      catalogSource: "canonical",
      configRevision: 0,
      error: null,
      questId: "fixture",
      retry,
      rows: fixtureQuestTaskCatalogRows,
      status: "ready",
    };
  }
  if (query.isPending) {
    return {
      catalogSource: null,
      configRevision: null,
      error: null,
      questId: null,
      retry,
      rows: [],
      status: "loading",
    };
  }
  if (query.isError) {
    return {
      catalogSource: null,
      configRevision: null,
      error: query.error,
      questId: null,
      retry,
      rows: [],
      status: "error",
    };
  }

  return {
    ...query.data,
    error: null,
    retry,
    status: "ready",
  };
}

export async function fetchQuestTaskPayload(
  client: QuestTaskBaseClient,
): Promise<unknown> {
  return client.get(questTaskEndpoint);
}

export async function fetchQuestTaskCatalogPayload(
  client: QuestTaskBaseClient,
): Promise<unknown> {
  return client.get(questTaskCatalogEndpoint);
}

export function mergeQuestTaskCatalogProgress(
  catalogRows: QuestTaskRow[],
  progressRows: QuestTaskRow[],
): QuestTaskRow[] {
  const progressByIdentity = new Map(
    progressRows
      .filter((row) => row.questId && row.taskKey)
      .map((row) => [`${row.questId}:${row.taskKey}`, row] as const),
  );

  return catalogRows.map((definition) => {
    if (!definition.questId || !definition.taskKey) return definition;
    const progress = progressByIdentity.get(
      `${definition.questId}:${definition.taskKey}`,
    );
    if (!progress) return definition;

    return {
      ...definition,
      ...(progress.capLabel ? { capLabel: progress.capLabel } : {}),
      ...(progress.capReached ? { capReached: true } : {}),
      ...(progress.capReason ? { capReason: progress.capReason } : {}),
      current: progress.current,
      progressLabel: progress.progressLabel,
      state: progress.state,
      stateLabel: progress.stateLabel,
      target: progress.target,
      unit: progress.unit,
    };
  });
}
