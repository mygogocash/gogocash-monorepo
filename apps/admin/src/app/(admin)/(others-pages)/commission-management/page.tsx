import { redirect } from "next/navigation";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

/** Standalone URL; same UI as Brands Management → Commission Management tab. */
export default async function CommissionManagementPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  redirect("/brands?tab=commission");
}
