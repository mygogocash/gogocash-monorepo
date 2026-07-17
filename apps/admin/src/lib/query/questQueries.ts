import client from "@/lib/axios/client";
import type {
  QuestLeaderboardResponse,
  QuestRewardSavePayload,
  QuestTaskConfigSavePayload,
  QuestTaskDeeplinkSummaryResponse,
  ResponseQuestDate,
} from "@/types/quest";

export const questListQueryKey = ["quest", "list"] as const;
export const questTaskDeeplinkSummaryQueryKey = (questId: string) =>
  ["quest", questId, "task-deeplinks"] as const;
export const questLeaderboardQueryKey = (questId: string) =>
  ["quest", questId, "leaderboard"] as const;

export async function fetchAdminQuests(): Promise<ResponseQuestDate[]> {
  const { data } = await client.get<ResponseQuestDate[]>(
    "/point/admin-get-quest",
  );
  return data;
}

export async function saveQuestCampaign(
  formData: FormData,
): Promise<ResponseQuestDate> {
  const { data } = await client.post<ResponseQuestDate>(
    "/point/create-quest",
    formData,
  );
  return data;
}

export async function saveQuestTasks(
  questId: string,
  payload: QuestTaskConfigSavePayload,
): Promise<ResponseQuestDate> {
  const { data } = await client.patch<ResponseQuestDate>(
    `/point/admin-quest/${questId}/tasks`,
    payload,
  );
  return data;
}

export async function saveQuestRewards(
  questId: string,
  payload: QuestRewardSavePayload,
): Promise<ResponseQuestDate> {
  const { data } = await client.patch<ResponseQuestDate>(
    `/point/admin-quest/${questId}/rewards`,
    payload,
  );
  return data;
}

export async function fetchQuestLeaderboard(
  questId: string,
): Promise<QuestLeaderboardResponse> {
  const { data } = await client.get<QuestLeaderboardResponse>(
    `/point/admin-quest/${questId}/leaderboard`,
  );
  return data;
}

export async function fetchQuestTaskDeeplinkSummary(
  questId: string,
): Promise<QuestTaskDeeplinkSummaryResponse> {
  const { data } = await client.get<QuestTaskDeeplinkSummaryResponse>(
    `/point/admin-quest/${questId}/task-deeplinks`,
  );
  return data;
}
