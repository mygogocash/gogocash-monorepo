"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_EVENT,
  isMarketingAllowed,
} from "@/lib/cookie-consent";

const LINE_TAG_SCRIPT_ID = "line-tag-base";
const LINE_TAG_LOADER_ID = "line-tag-loader";

/** LINE Tag (LAP) base snippet — init + page view. Injected only after consent. */
function lineTagInline(id: string): string {
  return `(function(g,d,o){
  g._ltq=g._ltq||[];g._lt=g._lt||function(){g._ltq.push(arguments)};
  if (d.getElementById('${LINE_TAG_LOADER_ID}')) return;
  var h=location.protocol==='https:'?'https://d.line-scdn.net':'http://d.line-cdn.net';
  var s=d.createElement('script');s.async=1;
  s.id='${LINE_TAG_LOADER_ID}';
  s.src=o||h+'/n/line_tag/public/release/v1/lt.js';
  var t=d.getElementsByTagName('script')[0];t.parentNode.insertBefore(s,t);
})(window, document);
_lt('init', {
  customerType: 'lap',
  tagId: '${id}'
});
_lt('send', 'pv', ['${id}']);`;
}

function removeLineTag(): void {
  document.getElementById(LINE_TAG_SCRIPT_ID)?.remove();
  document.getElementById(LINE_TAG_LOADER_ID)?.remove();
  const win = window as Window & {
    _lt?: unknown;
    _ltq?: unknown;
  };
  delete win._lt;
  delete win._ltq;
}

function installLineTag(id: string): void {
  if (document.getElementById(LINE_TAG_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = LINE_TAG_SCRIPT_ID;
  script.text = lineTagInline(id);
  document.head.appendChild(script);
}

/**
 * Cookie-consent gate (#7) for the LINE Tag JS. The script (and its tracking
 * cookies) load only once the visitor enables marketing cookies.
 */
export function LineTagGate({ id }: { id: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(isMarketingAllowed());
    sync();
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (allowed) installLineTag(id);
    else removeLineTag();
  }, [allowed, id]);

  return null;
}
