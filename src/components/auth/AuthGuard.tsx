"use client";

/** Sign-in is disabled: guard always renders children. Re-enable by restoring session checks below. */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}