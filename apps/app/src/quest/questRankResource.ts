import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { getMobileEnv } from "@mobile/config/env";
import {
  webQuestLeaderboardRows,
  webQuestMyRank,
} from "@mobile/design/webDesignParity";

import {
  mapMyQuestRank,
  mapQuestLeaderboardRows,
  mapQuestWindow,
  questLeaderboardEndpoint,
  questMyRankEndpoint,
  questWindowEndpoint,
  type QuestLeaderboardRow,
  type QuestMyRankValues,
  type QuestWindow,
} from "./questRankMapper";

export {
  questLeaderboardEndpoint,
  questMyRankEndpoint,
  questWindowEndpoint,
};
export type { QuestLeaderboardRow, QuestMyRankValues, QuestWindow };

type QuestBaseClient = {
  get(path: string): Promise<unknown>;
};

export type QuestResourceStatus =
  | "error"
  | "fixtures"
  | "loading"
  | "ready"
  | "signed-out";

// Design-mode (accountDataSource !== "backend") leaderboard fixture — the SAME rows the
// screen showed before, so preview/design builds are unchanged. In backend mode we never
// fall back to these fake rows (a fabricated leaderboard would be worse than an empty one).
export const fixtureQuestLeaderboardRows: QuestLeaderboardRow[] =
  webQuestLeaderboardRows.map((row) => ({
    key: row.name,
    name: row.name,
    points: row.points,
  }));

// Backend mode with no authed session / no data: honest zeros (mirrors prod's logged-out
// "0 points" behavior), never a fabricated rank.
export const signedOutMyQuestRank: QuestMyRankValues = {
  rankValue: "-",
  pointsValue: "0",
  spendingValue: "0",
  specialTasksValue: "0",
};

// Design-mode My Rank keeps the designed fixture values so preview builds look intact.
export const fixtureMyQuestRank: QuestMyRankValues = {
  rankValue: webQuestMyRank.rankValue,
  pointsValue: webQuestMyRank.pointsValue,
  spendingValue: webQuestMyRank.spendingValue,
  specialTasksValue: webQuestMyRank.specialTasksValue,
};

export function questWindowPath(): string {
  return questWindowEndpoint;
}

export function questLeaderboardPath(window: QuestWindow): string {
  return `${questLeaderboardEndpoint}/${window.startPath}/${window.endPath}`;
}

export function questMyRankPath(window: QuestWindow): string {
  return `${questMyRankEndpoint}/${window.startPath}/${window.endPath}`;
}

export async function fetchQuestWindowPayload(
  client: QuestBaseClient,
): Promise<unknown> {
  return client.get(questWindowPath());
}

export async function fetchQuestLeaderboardPayload(
  client: QuestBaseClient,
  window: QuestWindow,
): Promise<unknown> {
  return client.get(questLeaderboardPath(window));
}

export async function fetchMyQuestRankPayload(
  client: QuestBaseClient,
  window: QuestWindow,
): Promise<unknown> {
  return client.get(questMyRankPath(window));
}

export type QuestWindowResult = {
  status: QuestResourceStatus;
  window: QuestWindow | null;
};

export function useQuestWindow(): QuestWindowResult {
  const env = useMemo(() => getMobileEnv(), []);
  const backend = env.accountDataSource === "backend";
  const query = useQuery<unknown, Error>({
    enabled: backend,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) throw new Error("Quest session store is unavailable.");
      return fetchQuestWindowPayload(client);
    },
    queryKey: ["quest-window", env.apiUrl, questWindowEndpoint],
    retry: false,
  });

  if (!backend) return { status: "fixtures", window: null };
  if (query.isPending) return { status: "loading", window: null };
  if (query.isError) return { status: "error", window: null };
  return { status: "ready", window: mapQuestWindow(query.data) };
}

export type QuestLeaderboardResult = {
  rows: QuestLeaderboardRow[];
  status: QuestResourceStatus;
  usesFixture: boolean;
};

export function useQuestLeaderboard(
  window: QuestWindow | null,
): QuestLeaderboardResult {
  const env = useMemo(() => getMobileEnv(), []);
  const backend = env.accountDataSource === "backend";
  const query = useQuery<unknown, Error>({
    enabled: backend && !!window,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) throw new Error("Quest session store is unavailable.");
      return fetchQuestLeaderboardPayload(client, window as QuestWindow);
    },
    queryKey: [
      "quest-leaderboard",
      env.apiUrl,
      window?.startPath ?? null,
      window?.endPath ?? null,
    ],
    retry: false,
  });

  if (!backend) {
    return {
      rows: fixtureQuestLeaderboardRows,
      status: "fixtures",
      usesFixture: true,
    };
  }
  if (!window || query.isPending) {
    return { rows: [], status: "loading", usesFixture: false };
  }
  if (query.isError) {
    return { rows: [], status: "error", usesFixture: false };
  }
  return {
    rows: mapQuestLeaderboardRows(query.data),
    status: "ready",
    usesFixture: false,
  };
}

export type MyQuestRankResult = {
  data: QuestMyRankValues;
  status: QuestResourceStatus;
};

export function useMyQuestRank(window: QuestWindow | null): MyQuestRankResult {
  const env = useMemo(() => getMobileEnv(), []);
  const backend = env.accountDataSource === "backend";
  const auth = useAuthGuardSession();
  const session = useMobileSessionSnapshot();
  const sessionScope =
    typeof session?._id === "string" && session._id
      ? session._id
      : typeof session?.access_token === "string" && session.access_token
        ? `token:${session.access_token}`
        : "anon";
  const query = useQuery<unknown, Error>({
    enabled: backend && !!window && auth.ready && auth.isAuthed,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) throw new Error("Quest session store is unavailable.");
      return fetchMyQuestRankPayload(client, window as QuestWindow);
    },
    queryKey: [
      "quest-my-rank",
      env.apiUrl,
      window?.startPath ?? null,
      window?.endPath ?? null,
      sessionScope,
    ],
    retry: false,
  });

  if (!backend) return { data: fixtureMyQuestRank, status: "fixtures" };
  if (!auth.ready) return { data: signedOutMyQuestRank, status: "loading" };
  if (!auth.isAuthed) return { data: signedOutMyQuestRank, status: "signed-out" };
  if (!window || query.isPending) {
    return { data: signedOutMyQuestRank, status: "loading" };
  }
  if (query.isError) return { data: signedOutMyQuestRank, status: "error" };
  return {
    data: mapMyQuestRank(query.data) ?? signedOutMyQuestRank,
    status: "ready",
  };
}
