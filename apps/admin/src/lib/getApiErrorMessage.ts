/**
 * Normalizes errors from our axios client (interceptor rejects `response`, so `data.message`)
 * plus raw `AxiosError` shapes (`response.data.message`), generic `Error`, and the flat
 * `ApiError` objects (`{ message, status, errors }`) thrown by `apiClient` — which are plain
 * objects (not `Error` instances), so their top-level `message` must be read directly or every
 * failure collapses to the fallback.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as { response?: { data?: { message?: string | string[] } } })
      .response;
    const msg = res?.data?.message;
    if (Array.isArray(msg)) {
      const joined = msg
        .filter(
          (part): part is string =>
            typeof part === "string" && part.trim().length > 0,
        )
        .join(", ");
      if (joined) return joined;
    }
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { message?: string | string[] } }).data;
    if (data && Array.isArray(data.message)) {
      const joined = data.message
        .filter(
          (part): part is string =>
            typeof part === "string" && part.trim().length > 0,
        )
        .join(", ");
      if (joined) return joined;
    }
    if (data && typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  // Flat `ApiError` ({ message, status, errors }) thrown by apiClient — a plain
  // object, not an Error, with no response/data wrapper. Read its top-level
  // message directly (and append any field-level validation errors) so callers
  // surface the real reason instead of collapsing to the generic fallback.
  if (error && typeof error === "object" && "message" in error) {
    const { message, errors } = error as {
      message?: unknown;
      errors?: Record<string, string[]>;
    };
    if (typeof message === "string" && message.trim()) {
      const fieldErrors =
        errors && typeof errors === "object"
          ? Object.values(errors)
              .flat()
              .filter(
                (e): e is string =>
                  typeof e === "string" && e.trim().length > 0,
              )
          : [];
      return fieldErrors.length > 0
        ? `${message.trim()}: ${fieldErrors.join("; ")}`
        : message.trim();
    }
  }
  return fallback;
}
