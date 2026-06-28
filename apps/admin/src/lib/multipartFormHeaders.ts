import type { AxiosRequestConfig } from "axios";

/** Banner / media multipart uploads — fail fast instead of hanging on slow Drive uploads. */
export const MULTIPART_UPLOAD_TIMEOUT_MS = 120_000;

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
    timeout: MULTIPART_UPLOAD_TIMEOUT_MS,
    ...extra,
    headers: {
      ...extra?.headers,
      ...multipartAuthHeaders(accessToken),
    },
  };
}

function deleteContentTypeHeader(
  headers: Record<string, unknown>,
): void {
  const axiosHeaders = headers as {
    delete?: (name: string) => boolean;
    setContentType?: (value: false | string | null | undefined) => void;
  };
  if (typeof axiosHeaders.setContentType === "function") {
    axiosHeaders.setContentType(false);
    return;
  }
  if (typeof axiosHeaders.delete === "function") {
    axiosHeaders.delete("Content-Type");
    axiosHeaders.delete("content-type");
    return;
  }
  delete headers["Content-Type"];
  delete headers["content-type"];
}

/** Remove default JSON Content-Type so axios/browser can set multipart boundary. */
export function stripDefaultJsonContentTypeForFormData(
  headers: Record<string, unknown> | undefined,
  data: unknown,
): void {
  if (typeof FormData === "undefined" || !(data instanceof FormData) || !headers) {
    return;
  }
  deleteContentTypeHeader(headers);
}
