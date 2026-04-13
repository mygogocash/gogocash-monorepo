"use client";

import { useEffect, useMemo } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSenseSlotProps = {
  className?: string;
  slot: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  fullWidthResponsive?: boolean;
};

export default function AdSenseSlot({
  className,
  slot,
  format = "auto",
  fullWidthResponsive = true,
}: AdSenseSlotProps) {
  const adClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
  const adEnabled = Boolean(adClient && slot);
  const adKey = useMemo(
    () => `${slot}-${format}-${fullWidthResponsive}`,
    [slot, format, fullWidthResponsive]
  );

  useEffect(() => {
    if (!adEnabled) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense can throw when blocked by browser extensions; keep UI stable.
    }
  }, [adEnabled, adKey]);

  if (!adEnabled) {
    return <div className={className} aria-label="Ad placeholder" />;
  }

  return (
    <ins
      key={adKey}
      className={`adsbygoogle block ${className ?? ""}`.trim()}
      style={{ display: "block" }}
      data-ad-client={adClient}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}
