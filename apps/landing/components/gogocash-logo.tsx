import Image from "next/image";

interface GoGoCashLogoProps {
  className?: string;
  /**
   * Wordmark color only. The badge stays the full-color mark (`bg-primary` + PNG);
   * use when the logo sits on a dark bar. For an all-white lockup, add a dedicated asset.
   */
  variant?: "color" | "white";
  /**
   * `next/image` `sizes` for the mark. Default matches `size-8` (32px).
   * If you override the mark with e.g. `size-12` (48px), pass `"48px"` here for correct srcset.
   */
  markSizes?: string;
}

/**
 * Square mark box; `rounded-[26%]` tracks squircle-like corners with the asset.
 * `bg-primary` fills transparent edge pixels so corners read as the same green as the badge.
 */
export const GOGOCASH_LOGO_MARK_BOX =
  "size-8 shrink-0 overflow-hidden rounded-[26%] bg-primary";

/** Default `sizes` when the mark wrapper uses `size-8` (32 CSS px). */
export const GOGOCASH_LOGO_MARK_SIZES_DEFAULT = "32px";

export interface GoGoCashLogoMarkProps {
  /** Tailwind size utilities on the square wrapper (default `size-8`). */
  className?: string;
  /**
   * `next/image` `sizes` hint; should reflect the rendered width of the mark.
   * @default {@link GOGOCASH_LOGO_MARK_SIZES_DEFAULT}
   */
  sizes?: string;
  priority?: boolean;
  /** Empty string = decorative (aria-hidden). Set e.g. "GoGoCash" for standalone login branding. */
  alt?: string;
}

/** Logo mark only — same asset as `GoGoCashLogo`; use on login cards or compact UI. */
export function GoGoCashLogoMark({
  className = GOGOCASH_LOGO_MARK_BOX,
  sizes = GOGOCASH_LOGO_MARK_SIZES_DEFAULT,
  priority = false,
  alt = "",
}: GoGoCashLogoMarkProps) {
  const decorative = alt === "";

  return (
    <span className={`relative inline-block ${className}`}>
      <Image
        src="/images/gogocash-logo-mark.png"
        alt={alt}
        fill
        sizes={sizes}
        decoding="async"
        priority={priority}
        className="object-contain object-center select-none"
        {...(decorative ? { "aria-hidden": true as const } : {})}
      />
    </span>
  );
}

export default function GoGoCashLogo({
  className = "h-8",
  variant = "color",
  markSizes = GOGOCASH_LOGO_MARK_SIZES_DEFAULT,
}: GoGoCashLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <GoGoCashLogoMark priority sizes={markSizes} />
      <span
        className={`text-xl font-bold tracking-tight ${
          variant === "white" ? "text-white" : "text-gray-800"
        }`}
      >
        GoGoCash
      </span>
    </div>
  );
}
