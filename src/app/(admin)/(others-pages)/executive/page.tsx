import ExecutiveDashboardPageClient from "./ExecutiveDashboardPageClient";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export default async function ExecutiveDashboardPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return <ExecutiveDashboardPageClient />;
}
