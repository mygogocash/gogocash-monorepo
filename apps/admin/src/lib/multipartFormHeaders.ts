import type { AxiosRequestConfig } from "axios";

/** Banner / media multipart uploads — fail fast instead of hanging on slow Drive uploads. */
export const MULTIPART_UPLOAD_TIMEOUT_MS = 120_000;

/**
 * POST config for multipart FormData uploads.
 * Auth is attached by the BFF (`/api/backend`) from the NextAuth JWT cookie —
 * do not pass a Bearer token from the browser session.
 */
export function multipartPostConfig(
  extra?: AxiosRequestConfig,
): AxiosRequestConfig {
  return {
    timeout: MULTIPART_UPLOAD_TIMEOUT_MS,
    ...extra,
    headers: {
      ...extra?.headers,
    },
  };
}

function deleteContentTypeHeader(headers: Record<string, unknown>): void {
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
  if (
    typeof FormData === "undefined" ||
    !(data instanceof FormData) ||
    !headers
  ) {
    return;
  }
  deleteContentTypeHeader(headers);
}
