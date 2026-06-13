"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { planCycle, CYCLE_LABEL, CYCLE_BADGE } from "@/lib/subscriptionCycle";
import { formatDate } from "@/lib/dateFormat";
import {
  getCreditScoreDetail,
  getMembershipTiers,
  getMembershipUsers,
  getSubscriptions,
  getSubscriptionPlans,
} from "@/lib/api/adminModulesApi";
import type { Subscription, UserMembership } from "@/types/adminModules";
import MemberUserCard from "@/components/withdraw/MemberUserCard";
import SubUserCard from "@/components/withdraw/SubUserCard";
import BenefitsBillingHistory from "@/components/withdraw/BenefitsBillingHistory";
import UserScoringPanel from "@/components/credit-score/UserScoringPanel";
import ScoringConfigQuickView from "@/components/credit-score/ScoringConfigQuickView";

/**
 * The user's active membership + subscription benefit cards plus their combined
 * billing history (sortable + filterable). Shown on the withdraw-detail
 * "Benefits" tab. Self-contained: fetches its own membership/subscription data
 * (React Query dedupes the shared keys with the parent).
 */
export default function UserActiveBenefits({
  withdrawUserId,
  username,
  scrollToScoring = false,
}: {
  withdrawUserId: string;
  username: string;
  scrollToScoring?: boolean;
}) {
  const scoringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollToScoring) return;
    // Re-scroll a few times so the jump lands correctly after the benefit
    // cards, billing rows, and score chart finish loading and reflow the page.
    const scroll = () => scoringRef.current?.scrollIntoView({ block: "start" });
    const timers = [120, 400, 900].map((ms) => setTimeout(scroll, ms));
    return () => timers.forEach(clearTimeout);
  }, [scrollToScoring]);

  const { data: userSubscriptions } = useQuery({
    queryKey: ["admin", "subscription", "withdraw-detail", withdrawUserId],
    queryFn: () =>
      getSubscriptions({ page: 1, limit: 20, search: withdrawUserId }),
    enabled: Boolean(withdrawUserId),
  });
  const { data: userMembershipResp } = useQuery({
    queryKey: ["admin", "membership", "withdraw-detail", withdrawUserId],
    queryFn: () => getMembershipUsers({ page: 1, limit: 20, search: username }),
    enabled: Boolean(username),
  });
  const { data: membershipTiers } = useQuery({
    queryKey: ["admin", "membership", "tiers"],
    queryFn: getMembershipTiers,
  });
  const { data: subscriptionPlans } = useQuery({
    queryKey: ["admin", "subscription", "plans"],
    queryFn: getSubscriptionPlans,
  });
  // Deduped with UserScoringPanel's detail query (same key) — used only for the
  // "Scoring" heading's last-updated note.
  const { data: creditDetail } = useQuery({
    queryKey: ["admin", "credit", "detail", withdrawUserId],
    queryFn: () => getCreditScoreDetail(withdrawUserId),
    enabled: Boolean(withdrawUserId),
  });

  const userMembership =
    (userMembershipResp?.data ?? []).find(
      (m: UserMembership) => m.userId === withdrawUserId,
    ) ?? null;
  const membershipTier = (membershipTiers ?? []).find(
    (t) => t.id === userMembership?.tierId,
  );
  const membershipAmount = membershipTier?.monthlyPrice ?? 0;
  const membershipBilling = userMembership
    ? [
        {
          date: userMembership.startDate,
          amount: membershipAmount,
          status: "paid",
          method: "Credit card",
        },
        {
          date: userMembership.expiryDate,
          amount: membershipAmount,
          status: "scheduled",
          method: "Cash",
        },
      ]
    : [];

  const userSubscription =
    (userSubscriptions?.data ?? []).find(
      (s: Subscription) => s.userId === withdrawUserId,
    ) ?? null;
  const subPlan = (subscriptionPlans ?? []).find(
    (p) => p.id === userSubscription?.planId,
  );
  const subscriptionBilling = userSubscription
    ? [
        {
          date: userSubscription.startDate,
          amount: userSubscription.amount,
          status: "paid",
          method: userSubscription.paymentMethod,
        },
        {
          date: userSubscription.nextBillingDate,
          amount: userSubscription.amount,
          status: "scheduled",
          method: userSubscription.paymentMethod,
        },
      ]
    : [];
  const combinedBilling = [
    ...membershipBilling.map((b) => ({
      ...b,
      benefit: userMembership?.tierName ?? "Membership",
      benefitBadge:
        userMembership?.tierName === "GoGoPass Plus"
          ? "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    })),
    ...subscriptionBilling.map((b) => ({
      ...b,
      benefit: userSubscription
        ? `${CYCLE_LABEL[planCycle(userSubscription.planName)]} Sub`
        : "Subscription",
      benefitBadge: userSubscription
        ? CYCLE_BADGE[planCycle(userSubscription.planName)]
        : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    })),
  ];
  // Billing filter catalog (active plans only): active membership tiers + the
  // billing cycles of active subscription plans (deduped) — no fixed cycle enum,
  // so absent plans (e.g. Quarterly) never appear.
  const benefitOptions = [
    ...(membershipTiers ?? [])
      .filter((t) => t.isActive)
      .map((t) => ({ value: t.name, label: t.name })),
    ...Array.from(
      new Set(
        (subscriptionPlans ?? [])
          .filter((p) => p.status === "active")
          .map((p) => `${CYCLE_LABEL[p.billingCycle]} Sub`),
      ),
    ).map((l) => ({ value: l, label: l })),
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Benefits
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MemberUserCard
          membership={userMembership}
          tier={membershipTier}
          withdrawUserId={withdrawUserId}
        />
        <SubUserCard
          subscription={userSubscription}
          plan={subPlan}
          withdrawUserId={withdrawUserId}
        />
      </div>
      <BenefitsBillingHistory
        rows={combinedBilling}
        benefitOptions={benefitOptions}
      />
      <div
        ref={scoringRef}
        id="scoring"
        className="mt-8 scroll-mt-28 border-t border-gray-200 pt-8 dark:border-gray-700"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex flex-wrap items-baseline gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            Credit Score
            {creditDetail && (
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                (Last updated : {formatDate(creditDetail.lastUpdated)})
              </span>
            )}
          </h2>
          <ScoringConfigQuickView />
        </div>
        <div className="mt-4">
          <UserScoringPanel userId={withdrawUserId} />
        </div>
      </div>
    </div>
  );
}
