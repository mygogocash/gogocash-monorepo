"use client";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { Link } from "@/i18n/navigation";
import SubPage from "../profile/layout/SubPage";
import { useTranslations } from "next-intl";

const SubscriptionPage = () => {
  const t = useTranslations();
  return (
    <SubPage title="Subscription" showSubMenu>
      <div className="flex items-center flex-col w-full justify-center max-w-[400px] mx-auto">
        {FEATURE_FLAGS.stripeBilling ? (
          <div className="flex w-full flex-col items-center gap-4 rounded-[24px] border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 text-center">
            <h1 className="text-[24px] text-black">{t("Subscription")}</h1>
            <p className="text-[14px] text-[#4B5563]">{t("subscriptionStripeIntro")}</p>
            <Link
              href="/membership"
              className="rounded-full bg-[#00aa80] px-5 py-2 text-[14px] font-medium text-white"
            >
              {t("subscriptionStripeCta")}
            </Link>
            <Link
              href="/profile"
              className="text-[14px] font-medium text-[#4B5563] underline underline-offset-2"
            >
              {t("Back to Profile")}
            </Link>
          </div>
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
