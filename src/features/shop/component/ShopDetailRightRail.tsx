"use client";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import Button from "@/components/common/Button";
import type { CouponData, DataOffer } from "@/interfaces/offer";
import { Link as LocaleLink } from "@/i18n/navigation";
import { trackCouponInteraction } from "@/lib/analytics";
import { dmSans } from "@/lib/utils";
import { formatCouponCountdown } from "./shopDetailShared";

export type ShopDetailRightRailProps = {
  locale: string;
  activeCoupons: CouponData[];
  couponTick: number;
  offer: DataOffer | undefined;
};

export function ShopDetailRightRail({
  locale,
  activeCoupons,
  couponTick,
  offer,
}: ShopDetailRightRailProps) {
  const t = useTranslations();

  return (
    <div className="flex min-w-0 flex-col gap-14">
      <LocaleLink
        href="/quest"
        className="block overflow-hidden rounded-[24px] transition hover:opacity-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99]"
      >
        <Image
          src={locale === "th" ? "/quest/banner_th.png" : "/quest/banner_en.png"}
          alt=""
          width={720}
          height={405}
          className="h-[405px] w-full object-cover"
          sizes="(min-width: 1024px) 720px, 100vw"
        />
      </LocaleLink>

      <div className="flex flex-col gap-14">
        <div>
          <h2 className="text-xl font-semibold text-[#3b3b3b]">
            {t("Target Top Coupons and Deals")}
          </h2>
          {activeCoupons.length > 0 ? (
            <ul className="mt-6 flex list-none flex-col gap-2 p-0">
              {activeCoupons.map((coupon) => {
                const countdown = formatCouponCountdown(coupon.end_date, couponTick);
                const subtitle =
                  coupon.description?.trim() ||
                  (coupon.min_spend?.trim()
                    ? t("couponCappedAt", { amount: coupon.min_spend })
                    : "");
                const couponLink = coupon.link?.trim() || "";
                return (
                  <li key={coupon._id}>
                    <div className="flex overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="relative flex w-[108px] shrink-0 items-center justify-center bg-[#f0fdf9] sm:w-[128px] md:w-[140px]">
                        <Image
                          src="/coupon.svg"
                          alt=""
                          width={115}
                          height={100}
                          unoptimized
                          className="object-contain p-3"
                        />
                        <span
                          className="absolute top-1/2 right-0 hidden h-[70%] w-px -translate-y-1/2 border-r border-dashed border-[#e4e4e4] sm:block"
                          aria-hidden
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5 md:px-10 md:py-5">
                        <div className="flex min-w-0 items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-2xl font-semibold text-[#00cc99]">{coupon.name}</h3>
                            {subtitle ? (
                              <p className="mt-1 text-lg text-[#7f7f7f]">{subtitle}</p>
                            ) : null}
                            <p className="mt-1 font-mono text-sm text-[#3b3b3b]">
                              <span className="font-sans font-medium text-[#7f7f7f]">
                                {t("couponCodeLabel")}:{" "}
                              </span>
                              {coupon.code}
                            </p>
                            {couponLink ? (
                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                                <Link
                                  href={couponLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-[#00cc99] hover:underline"
                                  onClick={() => {
                                    trackCouponInteraction({
                                      merchant: offer || {},
                                      action: "terms_click",
                                      couponCode: coupon.code,
                                    });
                                  }}
                                >
                                  {t("Learn more")}
                                </Link>
                                <Link
                                  href="https://gogocash.gitbook.io/doc/promotion-campaign"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group inline-flex items-center gap-1 rounded-sm text-sm font-medium text-[#00aa80] transition-colors hover:bg-[#e6faf5] hover:text-[#00cc99] hover:underline"
                                  onClick={() => {
                                    trackCouponInteraction({
                                      merchant: offer || {},
                                      action: "terms_click",
                                      couponCode: coupon.code,
                                    });
                                  }}
                                >
                                  {t("Read")}
                                  <InfoOutlinedIcon
                                    sx={{ fontSize: 16, color: "currentColor" }}
                                    aria-hidden
                                  />
                                </Link>
                              </div>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            bgColor="#00cc99"
                            fontColor="#fff"
                            fontWeight={600}
                            fontSize="14px"
                            radius="999px"
                            minWidth="auto"
                            className="h-8 shrink-0 px-4"
                            onClick={() => {
                              trackCouponInteraction({
                                merchant: offer || {},
                                action: "copy",
                                couponCode: coupon.code,
                              });
                              void navigator.clipboard.writeText(coupon.code).then(() => {
                                toast.success(`${coupon.code} ${t("copied")}`);
                              });
                            }}
                          >
                            {t("Copy Code")}
                          </Button>
                        </div>
                        {countdown ? (
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-[#989898]">{t("Expires in")}</span>
                            {countdown.split(" : ").flatMap((unit, i, arr) => {
                              const items = [
                                <span
                                  key={`unit-${i}`}
                                  className="inline-flex h-7 min-w-[28px] items-center justify-center rounded border border-[#e4e4e4] px-1 text-sm text-[#7f7f7f]"
                                >
                                  {unit}
                                </span>,
                              ];
                              if (i < arr.length - 1) {
                                items.push(
                                  <span key={`sep-${i}`} className="text-[#989898]">
                                    :
                                  </span>
                                );
                              }
                              return items;
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-5 flex flex-col items-center">
              <Image
                src="/Empty-pana.png"
                alt=""
                width={302}
                height={302}
                className="mx-auto mt-2 h-full max-h-[280px] w-full max-w-[280px] object-contain"
              />
              <p className="mt-4 text-center text-xl font-semibold text-[#00cc99]">
                {t("No deals available right now")}
              </p>
              <p className="mt-2 max-w-md text-center text-base text-[#7f7f7f]">
                {t("Please favorite us to stay updated on great deals")}
              </p>
            </div>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-col items-start gap-4">
          <div className="flex w-full items-start gap-2">
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center text-[20px] leading-none select-none"
            >
              💡
            </span>
            <h2
              className={`${dmSans.className} text-[20px] font-semibold leading-normal text-black`}
            >
              {t("Coupons Trips")}
            </h2>
          </div>

          <figure className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#e4e4e4] bg-[#f0fdfa]">
            <Image
              src="/shop/merchant-cashback-tips-terms.svg"
              alt={t("merchantCashbackTipsIllustrationAlt")}
              width={368}
              height={1337}
              className="h-auto w-full object-contain object-top"
              sizes="(max-width: 1024px) 92vw, 814px"
              unoptimized
            />
          </figure>
        </div>
      </div>
    </div>
  );
}
