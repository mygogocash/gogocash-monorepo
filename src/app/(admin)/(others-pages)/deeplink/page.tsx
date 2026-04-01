import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "User Deeplink | GoGoCash Admin",
};

/** Standalone URL; same UI as Offers Management → User Deeplink tab. */
export default async function DeeplinkPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  redirect("/offers?tab=deeplink");
}
