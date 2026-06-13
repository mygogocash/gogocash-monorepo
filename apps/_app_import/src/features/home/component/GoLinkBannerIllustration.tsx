import Image from "next/image";

/**
 * GoLink home banner art — Figma export `Group 1000002990` (9669:184210), served from `/public/golink-banner/`.
 */
export function GoLinkBannerIllustration({ className }: { className?: string }) {
  return (
    <Image
      src="/golink-banner/banner-illustration.svg"
      alt=""
      width={442}
      height={203}
      className={className}
      sizes="(max-width: 1024px) min(100vw, 380px), 380px"
      aria-hidden
    />
  );
}
