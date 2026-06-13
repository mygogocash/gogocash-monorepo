"use client";

import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { useRouter } from "@/i18n/navigation";
import FavoriteOutlined from "@mui/icons-material/FavoriteOutlined";
import { IconButton } from "@mui/material";
import { MerchantSelectionContext, TrackableMerchant, trackMerchantSelect } from "@/lib/analytics";

/* eslint-disable @next/next/no-img-element */
interface IProp {
  logo: string;
  offer_name: string;
  percent: string | number;
  show_name_1?: boolean;
  green_text?: boolean;
  link?: string;
  favorite?: boolean;
  onClickFav?: () => void;
  onClick?: () => void;
  trackingOffer?: TrackableMerchant;
  trackingContext?: MerchantSelectionContext;
}
const CardFavorite = ({
  logo,
  offer_name,
  percent,
  green_text,
  link,
  favorite,
  onClickFav,
  onClick,
  trackingOffer,
  trackingContext,
}: IProp) => {
  const router = useRouter();
  const href = link && link !== "#" ? link : null;

  const goToOffer = () => {
    if (!href) return;
    onClick?.();
    if (trackingOffer && trackingContext) {
      trackMerchantSelect({
        merchant: trackingOffer,
        ...trackingContext,
      });
    }
    router.push(href);
  };

  return (
    <div
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
      className={`flex items-center justify-center${href ? " cursor-pointer" : ""}`}
      onClick={href ? goToOffer : undefined}
      onKeyDown={
        href
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToOffer();
              }
            }
          : undefined
      }
    >
      <div className="h-[196px] w-full max-w-[282px] rounded-2xl border border-[#E4E4E4] p-2">
        <img
          src={logo}
          alt={offer_name}
          width={266}
          height={105}
          className="rounded-2xl w-full h-[105px] object-center"
        />
        <div className="w-full mt-4 flex items-center justify-between h-full max-h-[53px]">
          <div className="flex flex-col ">
            <p
              className={`text-[16px] font-medium text-black ${
                "line-clamp-1" // show_name_1 ? "line-clamp-1" : "line-clamp-2"
              } `}
            >
              {offer_name}
            </p>
            <p
              className={`text-[16px] font-semibold ${
                !green_text ? "text-[#CD0D0D]" : ""
              } text-[#00B14F] line-clamp-1`}
            >
              {percent}
            </p>
          </div>
          <IconButton
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClickFav?.();
            }}
            sx={{
              border: "1px solid #E6F7ED",
              background: "#E6F7ED",
              borderRadius: "100px",
            }}
          >
            {favorite ? (
              <FavoriteOutlined
                sx={{
                  color: "#00B14F",
                }}
              />
            ) : (
              <FavoriteIcon />
            )}
          </IconButton>
        </div>
      </div>
    </div>
  );
};

export default CardFavorite;
