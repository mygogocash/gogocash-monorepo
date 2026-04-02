"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { shouldUseUnoptimizedImageSrc } from "@/utils/imageOptimization";

type RemoteOrBlobImageProps = {
  src: string;
  alt: string;
  className?: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  /** Merged onto the underlying `Image` (e.g. `{ width: "auto", height: "auto" }` when CSS resizes). */
  style?: CSSProperties;
};

export function RemoteOrBlobImage({
  src,
  alt,
  className,
  width,
  height,
  sizes,
  priority,
  style,
}: RemoteOrBlobImageProps) {
  const trimmed = typeof src === "string" ? src.trim() : "";
  if (!trimmed) {
    return (
      <span
        className={className}
        style={{ width, height, display: "inline-block", verticalAlign: "middle", ...style }}
        aria-hidden
      />
    );
  }

  return (
    <Image
      src={trimmed}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
      style={style}
      unoptimized={shouldUseUnoptimizedImageSrc(trimmed)}
    />
  );
}
