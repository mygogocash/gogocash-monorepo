/**
 * Profile hub uses an integrated shell; avoid the locale-level full-screen loader (min 3s)
 * on every in-hub navigation — content transitions are handled in `SubPage` instead.
 */
export default function ProfileLayoutLoading() {
  return null;
}
