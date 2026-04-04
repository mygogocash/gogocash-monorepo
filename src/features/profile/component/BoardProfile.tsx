import Button from "@/components/common/Button";
import { WalletSummaryHeroCard } from "@/components/common/WalletSummaryHeroCard";
import { Link, useRouter } from "@/i18n/navigation";
import { checkThai, cn, formatCashDisplay } from "@/lib/utils";
import { combineAvailableBalance } from "@/lib/withdraw/combineAvailableBalance";
import { useCrossmintLoginContext } from "@/providers/CrossmintLoginContext";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

export type BoardProfileProps = {
  /** Tighter stack when sitting above the profile nav (mobile hub). */
  className?: string;
};

/**
 * Profile hub cashback card — matches `WalletSummaryHeroCard` (header popper) for CI parity:
 * teal header, frosted body, combined available balance, last updated, mint Withdraw CTA.
 */
const BoardProfile = ({ className }: BoardProfileProps) => {
  const { data: session } = useSession();
  const t = useTranslations();
  const { getCheck } = useCrossmintLoginContext();
  const router = useRouter();

  const thai = checkThai || session?.user?.region === "Thailand";
  const currency = thai ? "THB" : "USD";
  const totalLine = formatCashDisplay(combineAvailableBalance(getCheck, thai));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <WalletSummaryHeroCard
        variant="popper"
        getCheck={getCheck}
        className="w-full max-w-none shadow-[0_4px_24px_rgba(12,20,18,0.12)]"
      />
      <div className="hidden justify-center md:flex">
        <Link
          href="/profile"
          className="text-sm font-medium text-[var(--gc-primary-strong)] no-underline hover:underline"
        >
          {t("View Profile")}
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gc-border)] bg-[var(--gc-surface)] px-4 py-3">
        <p className="min-w-0 text-xs leading-snug text-[var(--gc-text-muted)]">
          {t("Total Cashback")}{" "}
          <span className="font-medium text-[var(--gc-text)]">
            {totalLine} {currency}
          </span>
        </p>
        <Button
          uiVariant="secondary"
          uiSize="sm"
          className="shrink-0"
          onClick={() => {
            router.push("/wallet");
          }}
        >
          {t("View Wallet")}
        </Button>
      </div>
    </div>
  );
};

export default BoardProfile;
