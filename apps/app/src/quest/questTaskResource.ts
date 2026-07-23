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
  HARDCODED_SHOP_300_TASK,
  extraPointEndpoint,
  mapPublicBrandTasks,
} from "./questBrandTaskMapper";
import {
  mapBackendQuestTasks,
  questTaskEndpoint,
  type QuestTaskRow,
} from "./questTaskMapper";

export {
  HARDCODED_SHOP_300_TASK,
  extraPointEndpoint,
  mapBackendQuestTasks,
  mapPublicBrandTasks,
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

type QuestTaskBaseClient = {
  get(path: string): Promise<unknown>;
};

export const fixtureQuestTaskRows: QuestTaskRow[] = webQuestTaskRows.map(
  (task) => ({
    current: 0,
    icon: task.icon,
    key: task.title,
    points: task.points,
    progressLabel: "0 / 1 purchase",
    state: "not_started",
    stateLabel: "Not started",
    target: 1,
    taskType: "brand_purchase",
    title: task.title,
    unit: "purchase",
  }),
);

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

export async function fetchQuestTaskPayload(
  client: QuestTaskBaseClient,
): Promise<unknown> {
  return client.get(questTaskEndpoint);
}

// Design/preview (accountDataSource !== "backend") earn-list fixture: the same brand rows the
// screen showed before, plus the hardcoded prod-parity row, so non-backend builds stay intact.
export const fixtureBrandTaskRows: QuestTaskRow[] = [
  ...fixtureQuestTaskRows,
  HARDCODED_SHOP_300_TASK,
];

// PUBLIC GoGoQuest earn-list. Gated ONLY on accountDataSource === "backend" (NOT auth), so it
// renders for signed-out visitors exactly like prod app.gogocash.co. The hardcoded "Shop 300
// Baht+" row is appended after the /offer/extra-point brands.
export function useQuestBrandTasks(): QuestTaskResourceResult {
  const env = useMemo(() => getMobileEnv(), []);
  const { locale } = useLocale();
  const shouldFetchBackend = env.accountDataSource === "backend";
  const query = useQuery<unknown, Error>({
    enabled: shouldFetchBackend,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client)
        throw new Error("Quest brand task session store is unavailable.");
      return fetchPublicBrandTaskPayload(client);
    },
    queryKey: ["quest-brand-tasks", env.apiUrl, extraPointEndpoint, locale],
    retry: false,
  });

  const retry = () => {
    if (shouldFetchBackend) void query.refetch();
  };

  if (!shouldFetchBackend) {
    return { error: null, retry, rows: fixtureBrandTaskRows, status: "ready" };
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
    rows: [...mapPublicBrandTasks(query.data, locale), HARDCODED_SHOP_300_TASK],
    status: "ready",
  };
}

export async function fetchPublicBrandTaskPayload(
  client: QuestTaskBaseClient,
): Promise<unknown> {
  return client.get(extraPointEndpoint);
}
