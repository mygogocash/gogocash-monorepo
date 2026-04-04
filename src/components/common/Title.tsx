"use client";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface IProp {
  title: string;
  /** ICU values for `title` when the message uses placeholders, e.g. `{ category: "Electronics" }` */
  titleValues?: Record<string, string | number | Date>;
  imageTitle?: string;
  link?: string;
  icon?: React.ReactNode;
}
const Title = ({ title, titleValues, imageTitle, link, icon }: IProp) => {
  const t = useTranslations();
  return (
    <div className="flex items-end justify-between gap-4 mt-10 lg:mt-14">
      <div className="max-w-[720px]">
        <div className="gc-kicker mb-3">GoGoCash highlights</div>
        <h2 className="gc-section-title flex flex-wrap items-center gap-3">
          {icon && (
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E7F8EE] text-[22px] text-[#103522]">
              {icon}
            </span>
          )}
          <span>{titleValues ? t(title, titleValues) : t(title)}</span>
          {imageTitle && (
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(16,34,23,0.08)]">
              <Image src={imageTitle} alt="section badge" width={28} height={28} />
            </span>
          )}
        </h2>
      </div>
      {link && (
        <Link
          href={link}
          className="gc-inline-link gc-inline-link--regular hidden shrink-0 md:inline-flex"
        >
          {t("View all")}
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
};

export default Title;
