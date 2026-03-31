"use client";

import Image from "next/image";
import { SUPPORT_LINE_OFFICIAL_HREF } from "@/constants/navigation";
import { usePathname } from "@/i18n/navigation";

/** Floating LINE Official Account — square official logo in `public/line-official-fab.png`. */
export default function LineOfficialFab() {
  const pathname = usePathname();
  const hide = pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth");

  if (hide) {
    return null;
  }

  return (
    <a
      href={SUPPORT_LINE_OFFICIAL_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-4 z-60 size-14 overflow-hidden rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.15)] ring-2 ring-white/90 transition hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99] bottom-[calc(108px+0.75rem+env(safe-area-inset-bottom,0px))] md:bottom-8 md:right-8 md:size-16"
      aria-label="LINE Official Account"
      title="LINE Official Account"
    >
      <span className="relative block size-full bg-[#06C755]">
        <Image
          src="/line-official-fab.png"
          alt=""
          fill
          sizes="64px"
          unoptimized
          className="object-contain object-center"
          priority={false}
        />
      </span>
    </a>
  );
}
