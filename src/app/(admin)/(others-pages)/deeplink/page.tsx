import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Deeplink | GoGoCash Admin",
};

/** Standalone URL; same UI as Offers Management → Deeplink tab. */
export default function DeeplinkPage() {
  redirect("/offers?tab=deeplink");
}
