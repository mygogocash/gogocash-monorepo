import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "User tracking link | GoGoCash Admin",
};

/** Standalone URL; same UI as Offers Management → User tracking link tab. */
export default async function DeeplinkPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  redirect("/offers?tab=deeplink");
}
