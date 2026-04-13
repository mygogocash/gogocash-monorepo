"use client";

import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useMemo } from "react";

import { calculateCreditScore, getTier, type UserCreditData } from "./utils/scoreCalculator";

const ScoreHero = dynamic(() => import("./components/ScoreHero"), { ssr: false });
const ProgressBar = dynamic(() => import("./components/ProgressBar"), { ssr: false });
const ScoreBreakdown = dynamic(() => import("./components/ScoreBreakdown"), { ssr: false });
const BenefitsList = dynamic(() => import("./components/BenefitsList"), { ssr: false });
const StreakCard = dynamic(() => import("./components/StreakCard"), { ssr: false });
const BoostCTA = dynamic(() => import("./components/BoostCTA"), { ssr: false });

function mapSessionToCreditData(session: ReturnType<typeof useSession>["data"]): UserCreditData {
  const u = session?.user;
  if (!u) {
    return {
      monthlySpend: 0,
      monthlyTransactionCount: 0,
      emailVerified: false,
      phoneNumberVerified: false,
      profileComplete: false,
      trustedStreakMonths: 0,
      streakRewardStatus: "none",
    };
  }
  const email = u.email?.trim?.() ?? "";
  const hasUsername = Boolean(u.username && u.username.trim().length > 0);
  const hasAvatar = Boolean(u.avatar_url && String(u.avatar_url).length > 0);

  return {
    monthlySpend: 0,
    monthlyTransactionCount: 0,
    emailVerified: email.length > 0,
    phoneNumberVerified: Boolean(u.mobile && u.mobile.trim().length > 0),
    profileComplete: hasUsername && hasAvatar,
    trustedStreakMonths: 0,
    streakRewardStatus: "none",
  };
}

export default function CreditScorePageClient() {
  const { data: session, status } = useSession();
  const user = useMemo(() => mapSessionToCreditData(session), [session]);

  const score = useMemo(() => calculateCreditScore(user), [user]);
  const tier = useMemo(() => getTier(score), [score]);
  const isStarter = tier.key === "starter";

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-[430px] space-y-4 py-2 md:max-w-2xl" aria-busy="true">
        <div className="h-64 animate-pulse rounded-[var(--gc-radius-md)] bg-[var(--gc-surface-muted)]" />
        <div className="h-40 animate-pulse rounded-[var(--gc-radius-md)] bg-[var(--gc-surface-muted)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4 py-1 pb-24 md:max-w-2xl">
      <ScoreHero score={score} tier={tier} />
      {isStarter ? <ProgressBar score={score} /> : null}
      <ScoreBreakdown user={user} tier={tier} />
      <BenefitsList tier={tier} />
      <StreakCard user={user} />
      {isStarter ? <BoostCTA score={score} /> : null}
    </div>
  );
}
