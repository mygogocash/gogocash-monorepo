import { publicLineTagId, shouldLoadLineTag } from "@/lib/app-config";

type LineTagGlobal = Window & { _lt?: (...args: unknown[]) => void };

/**
 * Standard LINE conversion event — call after LINE Tag base has loaded (e.g. CTA click).
 */
export function sendLineTagConversion(): void {
  if (typeof window === "undefined") return;
  if (!shouldLoadLineTag()) return;
  const id = publicLineTagId();
  if (!id) return;

  const _lt = (window as LineTagGlobal)._lt;
  if (typeof _lt !== "function") return;

  try {
    _lt("send", "cv", { type: "Conversion" }, [id]);
  } catch {
    /* LINE script not ready or blocked */
  }
}
