"use client";

import Script from "next/script";

const fbSdkSrc = `https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0&appId=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID ?? ""}&autoLogAppEvents=1`;

/** Client-only: Facebook mutates `#fb-root`; `ssr: false` parent avoids SSR/client DOM drift. */
export default function FacebookQuestSdk() {
  return (
    <>
      <div id="fb-root" />
      <Script src={fbSdkSrc} strategy="afterInteractive" crossOrigin="anonymous" />
    </>
  );
}
