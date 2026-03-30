"use client";

import Image from "next/image";
import { shouldUseUnoptimizedImageSrc } from "@/utils/imageOptimization";

type RemoteOrBlobImageProps = {
  src: string;
  alt: string;
  className?: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
};

export function RemoteOrBlobImage({
  src,
  alt,
  className,
  width,
  height,
  sizes,
  priority,
}: RemoteOrBlobImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={shouldUseUnoptimizedImageSrc(src)}
    />
  );
}
