import Image from "next/image";
import { cn } from "@/lib/utils";

/** Pixel size for the square logo mark (header + auth card). */
export const LOGO_MARK_PX = 56;

export type LogoMarkProps = {
  /** Merged onto the outer wrapper (e.g. auth card margin / background). */
  className?: string;
};

/**
 * GoGoCash logo mark at a single canonical size — use everywhere the 56×56 mark appears.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <span
      className={cn(
        "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        className
      )}
    >
      <Image
        src="/logo.svg"
        alt=""
        width={LOGO_MARK_PX}
        height={LOGO_MARK_PX}
        sizes={`${LOGO_MARK_PX}px`}
        className="size-full max-h-14 max-w-14 object-contain"
        unoptimized
      />
    </span>
  );
}
