/** Auth headers for multipart FormData uploads. Do not set Content-Type — axios adds the boundary. */
export function multipartAuthHeaders(
  accessToken?: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}
