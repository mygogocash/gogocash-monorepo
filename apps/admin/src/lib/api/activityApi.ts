import client from "@/lib/axios/client";

export type AdminActivityEvent = {
  _id: string;
  occurred_at: string;
  actor_type: "admin" | "customer" | "system";
  actor_id?: string;
  actor_label?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type ActivityListResponse = {
  data: AdminActivityEvent[];
  total: number;
  page: number;
  limit: number;
};

export type ActivityListParams = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  actor_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  search?: string;
};

export async function listAdminActivity(
  params: ActivityListParams = {},
  signal?: AbortSignal,
): Promise<ActivityListResponse> {
  const { data } = await client.get<ActivityListResponse>("/admin/activity", {
    params,
    signal,
  });
  return data;
}
