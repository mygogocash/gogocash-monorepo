import { redirect } from "@/i18n/navigation";
import { consumeAppDynamicProps } from "@/lib/next/consumeAppDynamicProps";

/** Legacy URL — My Rating Score now lives at `/credit-score` under the Profile submenu. */
export default async function Page(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await props.params;
  await consumeAppDynamicProps(props);
  redirect({ href: "/credit-score", locale });
}
