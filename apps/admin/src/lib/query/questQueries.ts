import client from "@/lib/axios/client";
import { multipartPostConfig } from "@/lib/multipartFormHeaders";
import type {
  CreateQuestRevisionPayload,
  PublishQuestRevisionPayload,
  PublishQuestRevisionResponse,
  QuestEffectiveTasksResponse,
  QuestLeaderboardResponse,
  QuestManagementCapabilities,
  QuestRevisionResponse,
  QuestRewardSavePayload,
  QuestTaskConfigSavePayload,
  QuestTaskDeeplinkSummaryResponse,
  ResponseQuestDate,
} from "@/types/quest";

export const questListQueryKey = ["quest", "list"] as const;
export const questManagementCapabilitiesQueryKey = [
  "quest",
  "management-capabilities",
] as const;
export const questTaskDeeplinkSummaryQueryKey = (questId: string) =>
  ["quest", questId, "task-deeplinks"] as const;
export const questLeaderboardQueryKey = (questId: string) =>
  ["quest", questId, "leaderboard"] as const;
export const questEffectiveTasksQueryKey = (questId: string) =>
  ["quest", questId, "effective-tasks"] as const;

export async function fetchAdminQuests(): Promise<ResponseQuestDate[]> {
  const { data } = await client.get<ResponseQuestDate[]>(
    "/point/admin-get-quest",
  );
  return data;
}

export async function fetchQuestManagementCapabilities(): Promise<QuestManagementCapabilities> {
  const { data } = await client.get<QuestManagementCapabilities>(
    "/point/admin-quest-capabilities",
  );
  return data;
}

export async function saveQuestCampaign(
  formData: FormData,
): Promise<ResponseQuestDate> {
  const questId = formData.get("_id");
  if (typeof questId === "string" && questId.trim()) {
    // The quest id belongs in the route contract for edits. Keeping it out of
    // the body also lets the API reject all unknown multipart fields.
    formData.delete("_id");
    const { data } = await client.patch<ResponseQuestDate>(
      `/point/admin-quest/${encodeURIComponent(questId.trim())}/campaign`,
      formData,
      multipartPostConfig(),
    );
    return data;
  }
  const { data } = await client.post<ResponseQuestDate>(
    "/point/create-quest",
    formData,
    multipartPostConfig(),
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

export async function fetchQuestEffectiveTasks(
  questId: string,
): Promise<QuestEffectiveTasksResponse> {
  const { data } = await client.get<QuestEffectiveTasksResponse>(
    `/point/admin-quest/${questId}/effective-tasks`,
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

export async function createQuestRevision(
  questId: string,
  payload: CreateQuestRevisionPayload,
): Promise<QuestRevisionResponse> {
  const { data } = await client.post<QuestRevisionResponse>(
    `/point/admin-quest/${questId}/revisions`,
    payload,
  );
  return data;
}

export async function publishQuestRevision(
  questId: string,
  payload: PublishQuestRevisionPayload,
): Promise<PublishQuestRevisionResponse> {
  const { data } = await client.post<PublishQuestRevisionResponse>(
    `/point/admin-quest/${questId}/publish`,
    payload,
  );
  return data;
}
