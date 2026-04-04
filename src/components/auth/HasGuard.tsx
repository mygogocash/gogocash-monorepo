"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import DelayedPageLoadingScreen from "@/components/common/DelayedPageLoadingScreen";

export default function HasGuard({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (session) {
      router.push("/");
    } else {
      router.push("/login");
    }
  }, [status, router, session]);

  return (
    <>
      <DelayedPageLoadingScreen active={status === "loading"} label={t("pageLoading")} />
      {status !== "loading" ? children : null}
    </>
  );
}
