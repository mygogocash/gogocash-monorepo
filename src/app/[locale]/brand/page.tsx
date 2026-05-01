import PageClient from "./PageClient";
import { consumeAppDynamicProps } from "@/lib/next/consumeAppDynamicProps";

export default async function Page(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await consumeAppDynamicProps(props);
  return <PageClient />;
}
