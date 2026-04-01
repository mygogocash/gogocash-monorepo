/**
 * Normalizes errors from our axios client (interceptor rejects `response`, so `data.message`)
 * plus raw `AxiosError` shapes (`response.data.message`) and generic `Error`.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as { response?: { data?: { message?: string } } }).response;
    const msg = res?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data && typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
