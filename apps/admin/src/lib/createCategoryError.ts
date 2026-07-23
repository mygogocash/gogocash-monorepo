import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

/**
 * Toast copy for a failed policy-category create. Prefers the real backend
 * message (e.g. 'A category named "Fashion" already exists') via
 * getApiErrorMessage, and otherwise shows a plain, actionable line — never the
 * raw HTTP status, which meant nothing to admins.
 */
export function createCategoryErrorMessage(err: unknown): string {
  return getApiErrorMessage(
    err,
    "Couldn't create the category. Please try again, or contact an administrator if it continues.",
  );
}
