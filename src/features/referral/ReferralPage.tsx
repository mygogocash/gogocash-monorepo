"use client";

import { buildReferralInviteUrl, formatInviteLinkDisplay } from "@/lib/referral/referralLink";
import { useReferralSiteOrigin } from "@/lib/referral/useReferralSiteOrigin";
import SubPage from "../profile/layout/SubPage";
import ReferralEarnCard from "./component/ReferralEarnCard";
import ReferralFaqsSection from "./component/ReferralFaqsSection";
import ReferralHeroBanner from "./component/ReferralHeroBanner";
import ReferralInvitationPanel from "./component/ReferralInvitationPanel";
import ReferralStepsSection from "./component/ReferralStepsSection";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * Profile referral subpage — layout aligned with GoGoCash 1.1 Figma (node 8703:282022).
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8703-282022
 */
const ReferralPage = () => {
  const { data: session } = useSession();
  const t = useTranslations();
  const siteOrigin = useReferralSiteOrigin();
  const userId = session?.user?._id?.trim() ?? "";
  const referralUrl = useMemo(
    () => buildReferralInviteUrl(siteOrigin, userId),
    [siteOrigin, userId]
  );
  const displaySnippet = referralUrl
    ? formatInviteLinkDisplay(referralUrl)
    : t("profileInviteLinkEmpty");

  return (
    <SubPage title="Referral" showSubMenu>
      <ReferralHeroBanner />
      <ReferralEarnCard referralUrl={referralUrl || null} displaySnippet={displaySnippet} />
      <ReferralInvitationPanel />
      <ReferralStepsSection />
      <ReferralFaqsSection />
    </SubPage>
  );
};

export default ReferralPage;
