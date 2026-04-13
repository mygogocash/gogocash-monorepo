"use client";

import type { UserCreditData } from "../utils/scoreCalculator";
import { getStreakExpiryDays } from "../utils/scoreCalculator";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type StreakCardProps = {
  user: UserCreditData;
};

function Dot({ done }: { done: boolean }) {
  return (
    <span
      className={`h-9 w-9 rounded-full border ${
        done
          ? "border-[var(--gc-primary-strong)] bg-[var(--gc-primary-strong)]"
          : "border-[var(--gc-border)] bg-[var(--gc-surface)]"
      }`}
    />
  );
}

function MonthStatusPill({ completed, inProgress }: { completed: boolean; inProgress: boolean }) {
  if (completed) {
    return (
      <span className="rounded-full bg-[var(--gc-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--gc-accent)]">
        {`✅ Complete`}
      </span>
    );
  }
  if (inProgress) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        {`🔥 In progress`}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[var(--gc-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--gc-text-muted)]">
      {`🔒 Locked`}
    </span>
  );
}

export default function StreakCard({ user }: StreakCardProps) {
  const t = useTranslations("creditScore");
  const status = user.streakRewardStatus;

  if (status === "earned") {
    const days = user.streakRewardExpiresAt ? getStreakExpiryDays(user.streakRewardExpiresAt) : 0;
    return (
      <section className="rounded-[var(--gc-radius-md)] border border-[var(--gc-border-mint)] bg-[var(--gc-primary-soft)] p-5 ring-2 ring-[var(--gc-border-mint)]">
        <p className="font-bold text-[var(--gc-accent)]">{t("streak_earnedTitle")}</p>
        <p className="mt-1 text-sm text-[var(--gc-text)]">{t("streak_earnedBody")}</p>
        <p className="mt-3 text-sm font-medium text-[var(--gc-accent)]">
          {t("streak_expiresIn", { days })}
        </p>
        <Link
          href="/membership"
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--gc-primary-strong)] font-semibold text-white no-underline"
          style={{ color: "#fff" }}
        >
          {t("streak_redeemCta")}
        </Link>
      </section>
    );
  }

  if (status === "redeemed") {
    return (
      <section className="rounded-[var(--gc-radius-md)] border border-[var(--gc-border-mint)] bg-[var(--gc-primary-soft)] p-5">
        <p className="font-semibold text-[var(--gc-text)]">{t("streak_redeemedTitle")}</p>
        <p className="mt-1 text-sm text-[var(--gc-text-muted)]">
          {t("streak_redeemedBody", { date: user.streakRewardExpiresAt ?? "-" })}
        </p>
      </section>
    );
  }

  if (status === "expired") {
    return (
      <section className="rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-5">
        <p className="font-semibold text-[var(--gc-text)]">{t("streak_expiredTitle")}</p>
        <p className="mt-1 text-sm text-[var(--gc-text-muted)]">{t("streak_expiredBody")}</p>
        <p className="mt-2 text-xs font-medium text-[var(--gc-text-soft)]">{t("streak_reset")}</p>
      </section>
    );
  }

  const completed = Math.max(0, Math.min(3, user.trustedStreakMonths));
  return (
    <section className="rounded-[var(--gc-radius-md)] border border-[var(--gc-border-mint)] bg-[var(--gc-primary-soft)] p-5">
      <p className="font-semibold text-[var(--gc-text)]">{t("streak_title")}</p>
      <p className="mt-1 text-sm text-[var(--gc-text-muted)]">{t("streak_subtitle")}</p>

      <div className="mt-4 rounded-xl border border-[var(--gc-border)] bg-white/75 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <Dot done={completed >= 1} />
            <span className="text-xs font-medium text-[var(--gc-text-muted)]">
              {t("streak_month", { n: 1 })}
            </span>
          </div>
          <span className="h-px w-8 shrink-0 bg-[var(--gc-border)]" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <Dot done={completed >= 2} />
            <span className="text-xs font-medium text-[var(--gc-text-muted)]">
              {t("streak_month", { n: 2 })}
            </span>
          </div>
          <span className="h-px w-8 shrink-0 bg-[var(--gc-border)]" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <Dot done={completed >= 3} />
            <span className="text-xs font-medium text-[var(--gc-text-muted)]">
              {t("streak_month", { n: 3 })}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-[var(--gc-border)] bg-white px-3 py-2.5">
          <span className="text-sm font-medium text-[var(--gc-text)]">
            {t("streak_month", { n: 1 })}
          </span>
          <MonthStatusPill completed={completed >= 1} inProgress={false} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--gc-border)] bg-white px-3 py-2.5">
          <span className="text-sm font-medium text-[var(--gc-text)]">
            {t("streak_month", { n: 2 })}
          </span>
          <MonthStatusPill completed={completed >= 2} inProgress={completed < 2} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--gc-border)] bg-white px-3 py-2.5">
          <span className="text-sm font-medium text-[var(--gc-text)]">
            {t("streak_month", { n: 3 })}
          </span>
          <MonthStatusPill completed={completed >= 3} inProgress={false} />
        </div>
      </div>
    </section>
  );
}
