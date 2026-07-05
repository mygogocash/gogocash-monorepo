import { getSharedMobileApiClient } from "@mobile/api/sharedClient";

type UploadProfileAvatarResponse = {
  avatar_url?: string;
};

export async function uploadProfileAvatar(
  apiUrl: string,
  file: Blob,
  filename: string,
): Promise<string> {
  const client = await getSharedMobileApiClient(apiUrl);
  if (!client) {
    throw new Error("No mobile session store is available.");
  }

  const formData = new FormData();
  formData.append("avatar", file, filename);

  const response = await client.postFormData<UploadProfileAvatarResponse>(
    "/user/profile/avatar",
    formData,
  );

  const avatarUrl =
    typeof response?.avatar_url === "string" ? response.avatar_url.trim() : "";
  if (!avatarUrl) {
    throw new Error("Avatar upload did not return a URL.");
  }

  return avatarUrl;
}
