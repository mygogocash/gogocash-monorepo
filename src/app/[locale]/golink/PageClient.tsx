"use client";

import { useCallback } from "react";
import GoLinkFeature from "@/features/home/component/GoLinkFeature";
import GoLinkMobileSheet from "@/features/home/component/GoLinkMobileSheet";
import { useRouter } from "@/i18n/navigation";

export default function GolinkPageClient() {
  const router = useRouter();

  const close = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  return (
    <>
      <div className="gc-page-block mx-auto hidden w-full max-w-[640px] px-4 md:block">
        <GoLinkFeature />
      </div>

      <GoLinkMobileSheet onClose={close} />
    </>
  );
}
