"use client";

import "./credit-score.css";

import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useMemo } from "react";

import {
  calculateCreditScore,
  getPointsToNextTier,
  getTier,
  type CreditScoreInput,
} from "./utils/scoreCalculator";

const ScoreRing = dynamic(() => import("./components/ScoreRing"), { ssr: false });
const ProgressBar = dynamic(() => import("./components/ProgressBar"), { ssr: false });
const ScoreBreakdown = dynamic(() => import("./components/ScoreBreakdown"), { ssr: false });
const BenefitsList = dynamic(() => import("./components/BenefitsList"), { ssr: false });
const BoostCTA = dynamic(() => import("./components/BoostCTA"), { ssr: false });

function mapSessionToCreditInput(session: ReturnType<typeof useSession>["data"]): CreditScoreInput {
  const u = session?.user;
  if (!u) {
    return {
      transactionCount: 0,
      emailVerified: false,
      phoneNumberVerified: false,
      profileComplete: false,
    };
  }
  const email = u.email?.trim?.() ?? "";
  const hasUsername = Boolean(u.username && u.username.trim().length > 0);
  const hasAvatar = Boolean(u.avatar_url && String(u.avatar_url).length > 0);

  return {
    transactionCount: 0,
    emailVerified: email.length > 0,
    phoneNumberVerified: Boolean(u.mobile && u.mobile.trim().length > 0),
    profileComplete: hasUsername && hasAvatar,
  };
}

export default function CreditScorePageClient() {
  const { data: session, status } = useSession();
  const user = useMemo(() => mapSessionToCreditInput(session), [session]);

  const score = useMemo(() => calculateCreditScore(user), [user]);
  const tier = useMemo(() => getTier(score), [score]);
  const pointsToNext = useMemo(() => getPointsToNextTier(score), [score]);
  const isDiamond = tier.key === "diamond";

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-[430px] space-y-4 py-2 md:max-w-2xl" aria-busy="true">
        <div className="h-64 animate-pulse rounded-[var(--gc-radius-md)] bg-[var(--gc-surface-muted)]" />
        <div className="h-40 animate-pulse rounded-[var(--gc-radius-md)] bg-[var(--gc-surface-muted)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-5 py-1 pb-24 md:max-w-2xl md:gap-6">
      <ScoreRing score={score} tier={tier} pointsToNext={pointsToNext} />
      {!isDiamond ? <ProgressBar score={score} tier={tier} /> : null}
      <ScoreBreakdown user={user} isDiamondTier={isDiamond} />
      <BenefitsList tierKey={tier.key} />
      {!isDiamond ? <BoostCTA score={score} tier={tier} /> : null}
    </div>
  );
}
