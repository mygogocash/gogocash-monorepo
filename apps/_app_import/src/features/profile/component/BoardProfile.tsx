import { WalletSummaryHeroCard } from "@/components/common/WalletSummaryHeroCard";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSessionContext } from "@/providers/SessionContext";
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
  const t = useTranslations();
  const { getCheck } = useSessionContext();

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
    </div>
  );
};

export default BoardProfile;
