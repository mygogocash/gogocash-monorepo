import SubscriptionPage from "@/features/subscription/SubscriptionPage";
import { consumeAppDynamicProps } from "@/lib/next/consumeAppDynamicProps";

export default async function Subscription(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await consumeAppDynamicProps(props);

  return (
    <div className="gc-page-block">
      <SubscriptionPage />
    </div>
  );
}
