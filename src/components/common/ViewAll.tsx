import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { BRAND_MINT_HEX } from "@/constants/brand";
import UnionIcon from "../icons/UnionIcon";

interface IProp {
  link?: string;
  /** Figma 8290:133549 — same type scale as CardSpecial title (text-xl) + arrow */
  variant?: "default" | "emphasized";
}

const ViewAll = ({ link, variant = "default" }: IProp) => {
  const t = useTranslations();

  if (!link) {
    return null;
  }

  if (variant === "emphasized") {
    return (
      <Link
        href={link}
        className="hidden items-center gap-2 md:inline-flex"
        style={{ color: BRAND_MINT_HEX }}
      >
        <span className="text-xl font-normal leading-tight">{t("View All")}</span>
        <UnionIcon className="rotate-45 shrink-0" width={18} height={11} />
      </Link>
    );
  }

  return (
    <Link href={link} className="gc-inline-link hidden md:inline-flex">
      {t("View all")} <UnionIcon className="rotate-45" width={16} height={9} />
    </Link>
  );
};

export default ViewAll;
