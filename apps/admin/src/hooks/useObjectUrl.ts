"use client";

import { useEffect, useMemo } from "react";

/**
 * Returns a stable object URL for a File (or null when there's no File),
 * revoking the previous URL when the File changes and on unmount. Prevents the
 * blob-URL leak from calling `URL.createObjectURL` inline during render.
 */
export function useObjectUrl(file: File | null | undefined): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}
