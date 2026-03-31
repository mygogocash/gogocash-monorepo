import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import Button from "../Button";
import { Divider } from "@mui/material";
import { getPercent, pathImage } from "@/lib/utils";
import { DataOffer } from "@/interfaces/offer";
import { MerchantSelectionContext, trackMerchantSelect } from "@/lib/analytics";
interface IProp {
  offer: DataOffer;
  onClick?: () => void;
  trackingContext?: MerchantSelectionContext;
}
const CardTrend = ({ offer, onClick, trackingContext }: IProp) => {
  const router = useRouter();

  return (
    <div className="w-full">
      <div className="gc-soft-panel flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 gap-3 items-center">
          <Image
            src={pathImage(offer.logo_mobile)}
            alt={offer.offer_name}
            width={64}
            height={64}
            className="rounded-2xl border border-[#E7EFE8] bg-white"
          />
          <div className="flex min-w-0 flex-col">
            <p className="text-[16px] text-[#102217] font-semibold line-clamp-1">
              {offer.offer_name_display || offer.offer_name || ""}
            </p>
            <p className="text-[12px] uppercase tracking-[0.14em] text-[#87948B]">
              Recommended store
            </p>
            <p className="text-[13px] text-[#5B6B61] mt-1">
              Cashback up to{" "}
              <span className="text-[#00B14F] text-[20px] font-bold ml-1">
                {offer?.commission_store
                  ? offer.commission_store.toFixed(1)
                  : getPercent(offer.commissions || [], true)}
              </span>
            </p>
          </div>
        </div>
        <Button
          uiVariant="soft"
          uiSize="sm"
          onClick={() => {
            onClick?.();
            if (trackingContext) {
              trackMerchantSelect({
                merchant: offer,
                ...trackingContext,
              });
            }
            router.push(`/shop/${offer._id}`);
          }}
        >
          Shop
        </Button>
      </div>
      <Divider sx={{ mt: 2.5, mb: 2.5 }} />
    </div>
  );
};

export default CardTrend;
