import { Metadata } from "next";
import { redirect } from "next/navigation";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Policy Management | GoGoCash Admin",
  description: "Manage terms and conditions per category",
};

export default async function PolicyPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  redirect("/brands?tab=policy");
}
