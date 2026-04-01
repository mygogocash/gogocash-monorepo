"use client";

import Image from "next/image";

/**
 * Trust row for the site footer — Cloudflare mark (`/public/branding/cloudflare-logo.png`).
 */
export default function FooterSecuredByCloudflare({ securedByLabel }: { securedByLabel: string }) {
  return (
    <div className="mt-6 flex flex-col items-start gap-2">
      <span className="text-xs font-medium text-[#6b7280]">{securedByLabel}</span>
      <a
        href="https://www.cloudflare.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 opacity-90 transition-opacity hover:opacity-100"
        aria-label="Cloudflare"
      >
        <Image
          src="/branding/cloudflare-logo.png"
          alt=""
          width={200}
          height={80}
          className="h-8 w-auto max-w-[min(100%,200px)] object-contain object-left"
          sizes="200px"
        />
      </a>
    </div>
  );
}
