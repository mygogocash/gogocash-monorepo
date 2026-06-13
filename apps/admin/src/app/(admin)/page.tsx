import { redirect } from "next/navigation";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export default async function AdminRootPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  redirect("/dashboard");
}
