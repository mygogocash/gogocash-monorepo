import { marketingSiteOrigin } from "@/lib/app-config";

/** Canonical marketing site origin (no trailing slash). */
export function siteOrigin(): string {
  return marketingSiteOrigin();
}
