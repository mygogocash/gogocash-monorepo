import { publicLineTagId, shouldLoadLineTag } from "@/lib/app-config";
import { LineTagGate } from "@/components/line-tag-gate";

/**
 * LINE Tag base (LAP): init + page view. Matches LINE Business Manager snippet;
 * uses first-party-friendly loader from LINE CDN.
 *
 * The JS pixel is consent-gated via `LineTagGate` (#7). The `<noscript>` beacon
 * below cannot be gated without JS and fires for no-JS clients only (rare; mostly
 * bots) — a known, inherent limitation of pixel fallbacks.
 */
export function LineTagScripts() {
  const id = publicLineTagId();
  if (!shouldLoadLineTag() || !id) return null;

  const noscriptSrc = `https://tr.line.me/tag.gif?c_t=lap&t_id=${encodeURIComponent(id)}&e=pv&noscript=1`;

  return (
    <>
      <LineTagGate id={id} />
      <noscript>
        {/*
          LINE LAP noscript beacon: must stay a plain <img> (no JS). next/image is
          inappropriate inside <noscript> and for this third-party pixel URL.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element -- LAP noscript fallback; see comment above */}
        <img
          height={1}
          width={1}
          style={{ display: "none" }}
          alt=""
          src={noscriptSrc}
        />
      </noscript>
    </>
  );
}
