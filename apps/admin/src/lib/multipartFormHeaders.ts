import type { AxiosRequestConfig } from "axios";

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

/** POST config for multipart FormData uploads (auth only; boundary comes from the browser). */
export function multipartPostConfig(
  accessToken?: string | null,
  extra?: AxiosRequestConfig,
): AxiosRequestConfig {
  return {
    ...extra,
    headers: {
      ...extra?.headers,
      ...multipartAuthHeaders(accessToken),
    },
  };
}

/** Remove default JSON Content-Type so axios/browser can set multipart boundary. */
export function stripDefaultJsonContentTypeForFormData(
  headers: Record<string, unknown> | undefined,
  data: unknown,
): void {
  if (typeof FormData === "undefined" || !(data instanceof FormData) || !headers) {
    return;
  }
  delete headers["Content-Type"];
  delete headers["content-type"];
}
