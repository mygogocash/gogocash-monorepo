"use client";

import { getPostHogInitScript, isPostHogEnabled, markPostHogLoaded } from "@/lib/posthog";
import Script from "next/script";

const PostHogProvider = ({ children }: { children: React.ReactNode }) => {
  if (!isPostHogEnabled()) {
    return <>{children}</>;
  }

  return (
    <>
      <Script
        id="posthog-browser"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: getPostHogInitScript(),
        }}
        onReady={() => {
          markPostHogLoaded();
        }}
      />
      {children}
    </>
  );
};

export default PostHogProvider;
