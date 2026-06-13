"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import DelayedPageLoadingScreen from "@/components/common/DelayedPageLoadingScreen";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (status === "unauthenticated") {
      const q = pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : "";
      router.push(`/login${q}`);
    }
  }, [status, router, pathname]);

  return (
    <>
      <DelayedPageLoadingScreen active={status === "loading"} label={t("pageLoading")} />
      {status === "authenticated" ? children : null}
    </>
  );
}
