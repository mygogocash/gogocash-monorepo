import { Link } from "@/i18n/navigation";
import UnionIcon from "@/components/icons/UnionIcon";
import { MerchantSelectionContext, TrackableMerchant, trackMerchantSelect } from "@/lib/analytics";

/* eslint-disable @next/next/no-img-element */
interface IProp {
  logo: string;
  offer_name: string;
  percent: string;
  show_name_1?: boolean;
  green_text?: boolean;
  link?: string;
  onClick?: () => void;
  trackingOffer?: TrackableMerchant;
  trackingContext?: MerchantSelectionContext;
}
const CardImage = ({
  logo,
  offer_name,
  percent,
  show_name_1,
  green_text,
  link,
  onClick,
  trackingOffer,
  trackingContext,
}: IProp) => {
  const hasCashback = Boolean(percent && percent.trim().length > 0);

  return (
    <Link
      href={link || "#"}
      className="block h-full"
      onClick={() => {
        onClick?.();
        if (trackingOffer && trackingContext) {
          trackMerchantSelect({
            merchant: trackingOffer,
            ...trackingContext,
          });
        }
      }}
    >
      <article className="gc-surface-card group flex h-full flex-col overflow-hidden p-3 transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(16,34,23,0.12)]">
        <div className="relative overflow-hidden rounded-[20px] bg-[#F8FBF5] aspect-[1.08/1]">
          <img
            src={logo}
            alt={offer_name}
            width={266}
            height={105}
            className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute left-3 top-3">
            <span className="gc-pill bg-white/92">{hasCashback ? "Cashback" : "Category"}</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 px-1 pb-1 pt-4">
          <p
            className={`text-[16px] font-semibold text-[#102217] ${
              show_name_1 ? "line-clamp-1" : "line-clamp-2"
            }`}
          >
            {offer_name}
          </p>
          {hasCashback ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#87948B]">
                  Cashback up to
                </p>
                <p className="text-[13px] text-[#5B6B61]">Verified deal via GoGoCash</p>
              </div>
              <p
                className={`text-[22px] font-bold ${
                  green_text ? "text-[#00B14F]" : "text-[#103522]"
                } line-clamp-1`}
              >
                {percent}
              </p>
            </div>
          ) : (
            <div className="mt-auto flex items-center justify-between text-[#103522]">
              <p className="text-[13px] font-medium text-[#5B6B61]">Browse this collection</p>
              <p className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D8E2D9] bg-white">
                <UnionIcon className="rotate-45" width={16} height={9} />
              </p>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
};

export default CardImage;
