/* eslint-disable @next/next/no-img-element */
import { DataOffer } from "@/interfaces/offer";
import { pathImage } from "@/lib/utils";
interface IProp {
  list?: DataOffer[];
}
const SmallImg = ({ list }: IProp) => {
  const previewItems = list?.slice(0, 4) || [];

  return (
    <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-white/85 px-3 py-2 shadow-[0_12px_28px_rgba(16,34,23,0.08)] backdrop-blur">
      <div className="flex items-center">
        {previewItems.map((offer, index) => {
          return (
            <img
              key={index}
              src={`${pathImage(offer.logo_circle || offer.logo_desktop || offer.logo)}`}
              alt={offer.offer_name}
              className="h-10 w-10 rounded-full border-2 border-white object-cover -mr-2.5 last:mr-0"
            />
          );
        })}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#87948B]">
          Inside this edit
        </p>
        <p className="text-[13px] font-medium text-[#103522]">
          {list?.length || 0} featured stores
        </p>
      </div>
    </div>
  );
};

export default SmallImg;
