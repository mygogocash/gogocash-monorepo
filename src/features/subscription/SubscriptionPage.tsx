"use client";
import dynamic from "next/dynamic";
import { env } from "@/env";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { Link } from "@/i18n/navigation";

const CrossmintHostedCheckout = dynamic(
  () => import("@crossmint/client-sdk-react-ui").then((mod) => mod.CrossmintHostedCheckout),
  { ssr: false, loading: () => null }
);
import SubPage from "../profile/layout/SubPage";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

const SubscriptionPage = () => {
  const t = useTranslations();
  const { data: session } = useSession();
  return (
    <SubPage title="Subscription" showSubMenu>
      <div className="flex items-center flex-col w-full justify-center max-w-[400px] mx-auto">
        {FEATURE_FLAGS.subscription ? (
          <>
            <h1 className="text-[24px] text-black">{t("Subscription Standard")}</h1>
            <p className="text-[14px] text-[#A9A9A9] mb-6">
              {t("Subscribe to our standard plan for exclusive benefits")}
            </p>
            <CrossmintHostedCheckout
              className="w-full"
              lineItems={{
                collectionLocator: `crossmint:${env.NEXT_PUBLIC_CROSSMINT_COLLECTION_ID}`, // Collection identifier: crossmint:<YOUR_COLLECTION_ID>[:TEMPLATE_ID] or <blockchain>:<contract-address>
                callData: {
                  totalPrice: "2", // Total price in your contract's currency (e.g., 0.001 ETH, 2 USDC)
                  // Arguments for your contract's mint function (names must match exactly, don't pass recipient)
                },
              }}
              appearance={{
                display: "popup", // Open in a popup
                overlay: {
                  enabled: true, // Enable overlay
                },
                theme: {
                  button: "dark", // Dark button theme
                  checkout: "light", // Light checkout theme
                },
              }}
              payment={{
                crypto: {
                  enabled: true, // Enable crypto payments
                  defaultChain: "base-sepolia", // Default chain for crypto payments
                  defaultCurrency: "usdc", // Default currency for crypto payments
                },
                fiat: {
                  enabled: true, // Enable fiat payments
                  defaultCurrency: "usd", // Default currency for fiat payments
                },
                receiptEmail: "fronk.kunanon@gogocash.co", // Optional: Set receipt email
              }}
              recipient={{
                email: `${session?.user?.email}`, // NFTs will be delivered to this email's wallet
                // Or use walletAddress: "0x..." for direct delivery
              }}
              locale="en-US" // Set interface language
            />
          </>
        ) : (
          <div className="flex w-full flex-col items-center gap-3 rounded-[24px] border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 text-center">
            <h1 className="text-[24px] text-black">{t("Subscription")}</h1>
            <p className="text-[14px] text-[#4B5563]">
              {t("Subscription is temporarily unavailable")}
            </p>
            <p className="text-[14px] text-[#A9A9A9]">{t("Please check back later")}</p>
            <Link
              href="/profile"
              className="mt-2 rounded-full bg-[#00B14F] px-5 py-2 text-[14px] font-medium text-white"
            >
              {t("Back to Profile")}
            </Link>
          </div>
        )}
      </div>
    </SubPage>
  );
};

export default SubscriptionPage;
