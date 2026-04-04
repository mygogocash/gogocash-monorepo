"use client";

import { env } from "@/env";
import Script from "next/script";

const DEFAULT_GTM_ID = "GTM-WVGBK9HM";
const DEFAULT_GA_MEASUREMENT_ID = "G-Q66JRSM0MB";

const GTM_ID = env.NEXT_PUBLIC_GTM_ID?.trim() || DEFAULT_GTM_ID;
const GA_MEASUREMENT_ID = env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || DEFAULT_GA_MEASUREMENT_ID;
const isEnabled = env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";
const GA_DEBUG_MODE = env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";

export function GoogleTagManagerHead() {
  if (!isEnabled || !GTM_ID) return null;

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />

      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:false,anonymize_ip:true,debug_mode:${GA_DEBUG_MODE}});`,
        }}
      />
    </>
  );
}

export function GoogleTagManagerNoScript() {
  if (!isEnabled || !GTM_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
