import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface IProp {
  link?: string;
}

/**
 * Matches shop detail “Explore Other Shops” link — `gc-inline-link` + regular weight + arrow.
 */
const ViewAll = ({ link }: IProp) => {
  const t = useTranslations();

  if (!link) {
    return null;
  }

  return (
    <Link
      href={link}
      className="gc-inline-link gc-inline-link--regular hidden shrink-0 md:inline-flex"
    >
      {t("View all")}
      <span aria-hidden>→</span>
    </Link>
  );
};

export default ViewAll;
