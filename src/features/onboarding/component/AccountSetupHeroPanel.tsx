"use client";

/**
 * Promotional hero shown on the left at `md:` and up. Approximation of Figma
 * artwork for node 9022-914403 — replace with an exported SVG at
 * `/public/images/account-setup-hero-desktop.svg` when available, then swap
 * the placeholder block below for `<Image src="…" … />`.
 */
export function AccountSetupHeroPanel() {
  return (
    <div
      className="hidden overflow-hidden rounded-3xl bg-[#E8FBF4] p-8 md:block md:p-10 lg:p-12"
      aria-hidden
    >
      <div className="flex flex-col gap-6">
        <p
          className="whitespace-pre-line text-[44px] font-bold leading-[1.05] tracking-tight text-[#103522] lg:text-[56px]"
          lang="th"
        >
          {"ช็อปสนุก\nเงินคืนสนั่น"}
        </p>
        <p className="max-w-[320px] text-[15px] leading-relaxed text-[#3B4E42]" lang="th">
          แค่ช็อปกับเราก็คุ้มแล้ว กดติดตามเพื่อรับโปรพิเศษจาก{" "}
          <span className="font-semibold text-[#00AA80]">GoGoCash.co</span>
        </p>
        <div className="mt-2 flex h-[280px] items-center justify-center rounded-2xl bg-white/60 text-center text-xs text-[#7A8B81]">
          {/* TODO: swap this placeholder for the exported hero SVG. */}
          Hero artwork placeholder
        </div>
      </div>
    </div>
  );
}
