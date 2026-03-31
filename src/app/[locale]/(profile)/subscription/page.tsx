import SubscriptionPage from "@/features/subscription/SubscriptionPage";
import { consumeAppDynamicProps } from "@/lib/next/consumeAppDynamicProps";

export default async function Subscription(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await consumeAppDynamicProps(props);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <SubscriptionPage />
    </div>
  );
}
