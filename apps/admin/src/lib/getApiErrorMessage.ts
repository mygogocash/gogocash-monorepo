/** Appended to generic failures so the user always has a next step. */
const NEXT_ACTION =
  "Please try again, or contact an administrator if it continues.";

/** Default, next-action-carrying copy for a failure we can't describe further. */
export const GENERIC_ERROR_MESSAGE = `Something went wrong. ${NEXT_ACTION}`;

/**
 * Plain-language, status-aware copy for the *bare-status* fallback — used when
 * an HTTP failure carries no usable backend message. It never exposes the raw
 * status number to the user; callers still prefer a real backend `message`
 * (RolesGuard etc.), so this only fills the gap where there is none.
 */
export function friendlyStatusMessage(status?: number): string {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You don't have permission to do that. Ask an administrator if you need access.";
    case 404:
      return "That wasn't found. Please refresh and try again.";
    case 408:
    case 429:
      return "Please wait a moment and try again.";
    default:
      return GENERIC_ERROR_MESSAGE;
  }
}

type StructuredApiErrorBody = {
  message?: string | string[];
  reason?: unknown;
  code?: unknown;
};

/** Append Nest structured `reason` for policy readiness / txn gates (#407). */
function withOptionalReason(
  message: string,
  body: StructuredApiErrorBody | undefined,
): string {
  const reason =
    body && typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason || message.includes(reason)) {
    return message;
  }
  const code = body && typeof body.code === "string" ? body.code : "";
  if (
    code.startsWith("POLICY_") ||
    /replica set|mongos|integrity migration|transaction/i.test(message)
  ) {
    return `${message} (${reason})`;
  }
  return message;
}

function messageFromBody(body: StructuredApiErrorBody | undefined): string | null {
  if (!body) return null;
  const msg = body.message;
  if (Array.isArray(msg)) {
    const joined = msg
      .filter(
        (part): part is string =>
          typeof part === "string" && part.trim().length > 0,
      )
      .join(", ");
    return joined ? withOptionalReason(joined, body) : null;
  }
  if (typeof msg === "string" && msg.trim()) {
    return withOptionalReason(msg.trim(), body);
  }
  return null;
}

/**
 * Normalizes errors from our axios client (interceptor rejects `response`, so `data.message`)
 * plus raw `AxiosError` shapes (`response.data.message`), generic `Error`, and the flat
 * `ApiError` objects (`{ message, status, errors }`) thrown by `apiClient` — which are plain
 * objects (not `Error` instances), so their top-level `message` must be read directly or every
 * failure collapses to the fallback.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = GENERIC_ERROR_MESSAGE,
): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (
      error as { response?: { data?: StructuredApiErrorBody } }
    ).response;
    const fromBody = messageFromBody(res?.data);
    if (fromBody) return fromBody;
  }
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: StructuredApiErrorBody }).data;
    const fromBody = messageFromBody(data);
    if (fromBody) return fromBody;
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
