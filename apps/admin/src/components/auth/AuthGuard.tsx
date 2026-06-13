"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function AuthPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p
        className="text-sm text-gray-500 dark:text-gray-400"
        suppressHydrationWarning
      >
        {message}
      </p>
    </div>
  );
}

/**
 * Defer session-dependent UI until after mount so SSR and the first client paint match
 * (avoids hydration mismatch: useSession() can disagree with the server on the first pass).
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Intentional: first client paint must match SSR (placeholder); then enable session UI.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- defer until after mount for hydration parity
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || status !== "unauthenticated") return;
    const path = pathname || "/dashboard";
    router.replace(`/signin?callbackUrl=${encodeURIComponent(path)}`);
  }, [mounted, status, router, pathname]);

  if (!mounted) {
    return <AuthPlaceholder message="Loading…" />;
  }

  if (status === "loading") {
    return <AuthPlaceholder message="Loading…" />;
  }

  if (status === "unauthenticated") {
    return <AuthPlaceholder message="Redirecting to sign in…" />;
  }

  return <>{children}</>;
}
