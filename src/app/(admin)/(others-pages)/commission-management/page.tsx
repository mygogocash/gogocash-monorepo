import { redirect } from "next/navigation";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

/** Standalone URL; same UI as Offers Management → Commission Management tab. */
export default async function CommissionManagementPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  redirect("/offers?tab=commission");
}
