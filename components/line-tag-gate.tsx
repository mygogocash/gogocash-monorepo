"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_EVENT,
  isAnalyticsAllowed,
} from "@/lib/cookie-consent";

/** LINE Tag (LAP) base snippet — init + page view. Injected only after consent. */
function lineTagInline(id: string): string {
  return `(function(g,d,o){
  g._ltq=g._ltq||[];g._lt=g._lt||function(){g._ltq.push(arguments)};
  var h=location.protocol==='https:'?'https://d.line-scdn.net':'http://d.line-cdn.net';
  var s=d.createElement('script');s.async=1;
  s.src=o||h+'/n/line_tag/public/release/v1/lt.js';
  var t=d.getElementsByTagName('script')[0];t.parentNode.insertBefore(s,t);
})(window, document);
_lt('init', {
  customerType: 'lap',
  tagId: '${id}'
});
_lt('send', 'pv', ['${id}']);`;
}

/**
 * Cookie-consent gate (#7) for the LINE Tag JS. The script (and its tracking
 * cookies) load only once the visitor accepts; it re-evaluates on consent change.
 */
export function LineTagGate({ id }: { id: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(isAnalyticsAllowed());
    sync();
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  if (!allowed) return null;

  return (
    <Script id="line-tag-base" strategy="afterInteractive">
      {lineTagInline(id)}
    </Script>
  );
}
