import client from "@/lib/axios/client";
import type { MyCashbackResponse } from "@/types/user";

export type MyCashbackUsersListResponse = {
  status?: string;
  data: MyCashbackResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function listMyCashbackUsers(params: {
  page: number;
  limit: number;
  search: string;
}): Promise<MyCashbackUsersListResponse> {
  const res = await client.post<MyCashbackUsersListResponse>(
    "/admin/list-mycashback-users",
    params,
  );
  return res.data;
}
