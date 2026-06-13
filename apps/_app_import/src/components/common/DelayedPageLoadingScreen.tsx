"use client";

import dynamic from "next/dynamic";
import { MIN_PAGE_LOADING_MS, useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";

const PageLoader = dynamic(() => import("./PageLoader"), { ssr: false });

type DelayedPageLoadingScreenProps = {
  active: boolean;
  label: string;
};

/**
 * Full-viewport overlay that stays visible for at least {@link MIN_PAGE_LOADING_MS}
 * after `active` becomes false. Parent should keep this mounted while `active` can toggle.
 */
export default function DelayedPageLoadingScreen({ active, label }: DelayedPageLoadingScreenProps) {
  const show = useMinimumLoadingDuration(active, MIN_PAGE_LOADING_MS);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-200 flex min-h-dvh w-full items-center justify-center bg-(--gc-surface,#ffffff)">
      <p className="sr-only" role="status">
        {label}
      </p>
      <PageLoader />
    </div>
  );
}
