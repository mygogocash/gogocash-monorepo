import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

/**
 * Toast message for a failed policy-category create. The axios client's
 * response interceptor rejects with `error.response`, so the API message is at
 * `err.data.message` (handled by getApiErrorMessage) and the HTTP status at
 * `err.status`. When the API sends no message, include the status so a 404
 * (missing route) or 502 is diagnosable from the toast alone.
 */
export function createCategoryErrorMessage(err: unknown): string {
  const status =
    err &&
    typeof err === "object" &&
    "status" in err &&
    typeof (err as { status?: unknown }).status === "number"
      ? (err as { status: number }).status
      : null;
  const fallback =
    status !== null
      ? `Failed to create category (HTTP ${status}).`
      : "Failed to create category.";
  return getApiErrorMessage(err, fallback);
}
