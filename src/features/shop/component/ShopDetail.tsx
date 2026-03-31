/* eslint-disable @next/next/no-img-element */
"use client";
import dynamic from "next/dynamic";
import {
  CouponData,
  DataFav,
  DataOffer,
  IResponseFav,
  IResponseOffer,
  TypeCommissions,
} from "@/interfaces/offer";
import { fetcher } from "@/lib/axios/client";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
// import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";
import FavoriteIcon from "@mui/icons-material/Favorite";
import Button from "@/components/common/Button";
import BankIcon from "@/components/icons/BankIcon";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { generateDeeplink } from "@/lib/services/detail";
import toast from "react-hot-toast";
import { ResponseGenerateDeeplink } from "@/interfaces/shop";
import { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import { hasApiBaseUrl } from "@/lib/env";
import { cn, getPercent } from "@/lib/utils";
import LoadingShop from "./LoadingShop";
import Image from "next/image";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { dmSans } from "@/lib/utils";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { favoriteOffer } from "@/lib/services/offer";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Link from "next/link";
import { Link as LocaleLink } from "@/i18n/navigation";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import CheckroomOutlinedIcon from "@mui/icons-material/CheckroomOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import EastOutlinedIcon from "@mui/icons-material/EastOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import {
  trackCouponInteraction,
  trackFavoriteToggle,
  trackMerchantDetailView,
  trackMerchantRedirect,
  getCashbackValue,
} from "@/lib/analytics";
import { trackMetaViewContent, trackMetaInitiateCheckout } from "@/lib/metaPixel";
import { POSTHOG_FLAG_KEYS, usePostHogFlagPayload } from "@/lib/posthog";
import { useMerchantBrandHero } from "@/features/shop/hooks/useMerchantBrandHero";

const ShopDetailExploreRelated = dynamic(() => import("./ShopDetailExploreRelated"), {
  loading: () => (
    <div className="mt-12 h-64 w-full animate-pulse rounded-2xl bg-[#f0f0f0] md:h-80" aria-hidden />
  ),
});

/** Shared pill styles — merchant summary tags (Figma 8345:118148 rail). */
const merchantSummaryTagBase =
  "inline-flex max-w-full min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-left text-sm font-medium leading-snug shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:min-h-[2.5rem] sm:px-4 sm:text-[0.9375rem]";

/** Mirrors `merchantSummaryTagsAria` in message JSON — used if catalog is stale or key missing (avoids MISSING_MESSAGE). */
const MERCHANT_SUMMARY_TAGS_ARIA_FALLBACK: Record<string, string> = {
  en: "Offer highlights",
  th: "จุดเด่นของข้อเสนอ",
  jp: "オファーのハイライト",
};

function formatCouponCountdown(endDateIso: string, _tick: number): string | null {
  void _tick;
  const end = new Date(endDateIso).getTime();
  if (Number.isNaN(end)) return null;
  const diff = Math.max(0, end - Date.now());
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")} : ${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;
}

const ShopDetail = () => {
  const { id } = useParams();
  const t = useTranslations();
  const locale = useLocale();
  const messages = useMessages() as Record<string, unknown>;
  const merchantSummaryTagsAriaLabel =
    typeof messages.merchantSummaryTagsAria === "string"
      ? messages.merchantSummaryTagsAria
      : (MERCHANT_SUMMARY_TAGS_ARIA_FALLBACK[locale] ?? MERCHANT_SUMMARY_TAGS_ARIA_FALLBACK.en);
  const { data: session } = useSession();
  const lg = useMediaQuery("(min-width:768px)");
  const [openLink, setOpenLink] = useState(false);
  const showOpenLinkLoading = useMinimumLoadingDuration(openLink);
  const merchantDetailExperiment = usePostHogFlagPayload<{
    shop_now_label?: string;
  }>(POSTHOG_FLAG_KEYS.merchantDetailCta, {});
  const { data: offer } = useQuery<DataOffer>({
    queryKey: ["getOffersDetail", id],
    queryFn: () => fetcher(`/offer/${id}`),
    staleTime: Infinity,
    enabled: id !== undefined,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const [dataFav] = useState({
    page: 1,
    limit: 100,
  });

  const { data: getFavouriteOffer, refetch: refetchFavList } = useQuery<IResponseFav>({
    queryKey: ["getFavouriteOffer", id, dataFav.page, dataFav.limit],
    queryFn: () => fetcher(`/offer/favorite/${dataFav.page}/${dataFav.limit}`),
    staleTime: Infinity,
    enabled: id !== undefined,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const trackedOfferRef = useRef("");

  const [offerSearch] = useState({
    category: offer?.categories || "",
    page: 1,
    limit: 8,
    search: "",
  });

  const { data: offers } = useQuery<IResponseOffer>({
    queryKey: ["getOfferByCategory", offerSearch, offer?.categories],
    queryFn: () =>
      fetcher(
        `/offer?category=${offerSearch.category || offer?.categories}&search=${
          offerSearch.search
        }&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: 60_000,
  });

  const { isPending: loadingFav, mutateAsync: mutateFav } = useMutation({
    mutationKey: ["mutateFav"],
    mutationFn: favoriteOffer,
    onSuccess(data: DataFav, variables: { offer_id: string }) {
      const toggledId = variables.offer_id;
      const merchantForAnalytics =
        offer?._id === toggledId
          ? offer
          : (offers?.data?.find((o) => o._id === toggledId) ?? offer);

      const wasFavorite =
        getFavouriteOffer?.data
          ?.map((item) => item?.offer_id?._id.toString())
          .includes(toggledId?.toString()) ?? false;

      if (merchantForAnalytics) {
        trackFavoriteToggle({
          merchant: merchantForAnalytics,
          action: wasFavorite ? "remove" : "add",
          location: offer?._id === toggledId ? "merchant_detail" : "merchant_detail_related",
        });
      }

      if (data) {
        toast.success("Favorite offer successfully");
      } else {
        toast.success("Unfavorite offer successfully");
      }
      refetchFavList();
    },
    onError(_error: { data?: { message?: string } }) {
      toast.error(_error?.data?.message || "Failed to favorite this offer");
    },
  });

  const percent = offer?.commission_store || getPercent(offer?.commissions as TypeCommissions[]);

  const percentSpecial = getPercent(offer?.special_commissions as TypeCommissions[]);

  const sumPercent = parseFloat(percent?.toString()) + parseFloat(percentSpecial?.toString());

  const { isPending: loadingGenerateDeeplink, mutateAsync: mutateGenerateDeeplink } = useMutation({
    mutationKey: ["generateDeeplink"],
    mutationFn: generateDeeplink,
    onSuccess(data: ResponseGenerateDeeplink) {
      if (offer) {
        trackMerchantRedirect({
          merchant: offer,
          status: "success",
        });
      }
      if (data) {
        setOpenLink(true);
        setTimeout(() => {
          window.location.href = data?.deeplink;
        }, 3000);
        // window.open(data?.deeplink, "_blank");
      }
    },
    onError(_error: AxiosError) {
      if (offer) {
        trackMerchantRedirect({
          merchant: offer,
          status: "error",
        });
      }
      toast.error(_error?.message || "Failed to generate deeplink");
    },
  });

  const { data: couponDetail } = useQuery<CouponData[]>({
    queryKey: ["getOffersCouponData", id],
    queryFn: () => fetcher(`/offer/get-coupon-id/${id}`),
    staleTime: 60_000,
    enabled: !!id,
  });

  const openLinkOffer = () => {
    if (session) {
      if (offer) {
        trackMerchantRedirect({
          merchant: offer,
          status: "attempt",
        });

        // REQ-004: Meta Pixel InitiateCheckout
        trackMetaInitiateCheckout();

        mutateGenerateDeeplink({
          offer_id: offer?.offer_id,
          merchant_id: offer?.merchant_id,
          preview_url: offer.preview_url,
        });
      }
    } else {
      if (offer) {
        trackMerchantRedirect({
          merchant: offer,
          status: "login_required",
        });
      }
      toast.error("Please login to continue");
    }
  };

  useEffect(() => {
    if (!offer?._id || trackedOfferRef.current === offer._id) return;

    trackedOfferRef.current = offer._id;
    trackMerchantDetailView({
      merchant: offer,
      sourceList: "merchant_detail",
    });

    // REQ-002: Meta Pixel ViewContent
    trackMetaViewContent({
      content_name: offer.offer_name_display || offer.offer_name || "",
      content_category: "merchant",
      content_ids: [String(offer.merchant_id || offer._id)],
      value: getCashbackValue(offer) || 0,
      currency: "USD",
    });
  }, [offer]);

  const activeCoupons = useMemo(() => {
    if (!couponDetail || !(session || !hasApiBaseUrl())) return [];
    return couponDetail.filter(
      (coupon) => !coupon.disabled && new Date(coupon.end_date) >= new Date()
    );
  }, [couponDetail, session]);

  const [couponTick, setCouponTick] = useState(0);
  // eslint-disable-next-line react-hooks/purity -- ref is seeded once at mount; value updates only in the interval below
  const couponNowMsRef = useRef(Date.now());

  useEffect(() => {
    if (activeCoupons.length === 0) return undefined;
    couponNowMsRef.current = Date.now();
    const id = window.setInterval(() => {
      couponNowMsRef.current = Date.now();
      setCouponTick((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeCoupons]);

  const couponExpiryDays =
    activeCoupons.length === 0
      ? null
      : (() => {
          void couponTick;
          const ends = activeCoupons.map((c) => new Date(c.end_date).getTime());
          const nearest = Math.min(...ends);
          const days = Math.ceil((nearest - couponNowMsRef.current) / 86400000);
          if (!Number.isFinite(days)) return null;
          return Math.max(0, days);
        })();

  const hasMerchantSummaryTags =
    Boolean(offer?.categories) ||
    Number(percentSpecial) > 0 ||
    activeCoupons.length > 0 ||
    couponExpiryDays !== null;

  const cashbackTipItems: {
    title: string;
    description: string;
    decor?: "shopFlow" | "adAlerts";
  }[] = [
    {
      title: t("Remember to check T&Cs"),
      description: t(
        "Check carefully for Cashback exclusions and caps before you buy or book to avoid disappointment Don't forget the terms and conditions on any promotion and campaign pages"
      ),
    },
    {
      title: t("Restart from this platform every time"),
      description: t(
        "Complete your shopping in one go Always start from this platform to visit the store directly, for every new transaction If your store visit is interrupted by an app update or download screen, restart your shopping from our platform"
      ),
      decor: "shopFlow",
    },
    {
      title: t("Don't use adblockers or click on other links"),
      description: t(
        "Don't click on any third party links or extensions or use VPN or adblocking software, as they could result in your Cashback not being tracked Some examples include Facebook ads, Google Ads, other loyalty or cashback extension links"
      ),
      decor: "adAlerts",
    },
    {
      title: t("Empty shopping cart first"),
      description: t(
        "For Expedia, you need to clear your cart, close the Expedia app, open this platform to visit the Expedia app or website and complete your purchase there in order to earn Cashback You need to do this for each purchase"
      ),
    },
    {
      title: t("Restart from this platform if payment fails"),
      description: t(
        "If you encounter payment errors during your purchase, you should restart your visit to the Expedia from this platform to ensure that your Cashback continues to be tracked"
      ),
    },
    {
      title: t("Accept all cookies from the store"),
      description: t(
        "Expedia can only confirm to us that a transaction is recorded if you accept all cookies that appear on their pages"
      ),
    },
  ];

  const termSections = [
    {
      title: t("Exclusions"),
      subtitle: t("You won't get Cashback on:"),
      description: [
        t("Purchases made with Vouchers or Promo codes not featured on our platform"),
        t("Taxes · Service charges · Shipping and delivery"),
      ],
    },
    {
      title: t("Refunds, Cancellations, & no-shows"),
      subtitle: t(
        "Any rejected, cancelled, refunded, exchanged or returned purchases will not be eligible for Cashback"
      ),
      description: [
        t("For partial returns or exchanges, we'll prorate the Cashback as an adjustment"),
      ],
    },
    {
      title: t("Tracking Disclaimers"),
      subtitle: "",
      description: [
        t(
          "Your Cashback may be tracked at a different rate initially and adjusted to the correct rate when we confirm the transaction details"
        ),
      ],
    },
    {
      title: t("Other terms and conditions"),
      subtitle: "",
      description: [t("GoGoCash terms of use")],
    },
  ];

  /** Up to 8 shops: 2 rows × 4 columns on md+ (Figma explore grid). */
  const exploreRelatedOffers = useMemo(
    () => (offers?.data ?? []).filter((o) => o._id !== offer?._id).slice(0, 8),
    [offers?.data, offer?._id]
  );

  const { heroBannerSrc, heroLogoSrc, heroBannerIsStock } = useMerchantBrandHero(offer, lg);

  return (
    <section className="w-full pt-6 md:pt-8 lg:pt-10">
      {showOpenLinkLoading ? (
        <LoadingShop offer={offer} openLinkOffer={openLinkOffer} />
      ) : (
        <>
          {/*
           * GoGoCash 1.1 — Merchant Summary (page)
           * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8345-118148
           * Shop hero — banner + floating bar (single stack, centered)
           * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8549-202431
           */}
          <div className="mb-8 md:mb-10">
            <div className="flex w-full flex-col items-center pb-8 md:pb-10">
              {/* Banner + logo — Figma 8549:202432 (aspect 1200×410, mb -40 overlap) */}
              <div className="relative z-0 -mb-10 w-full max-w-full overflow-hidden rounded-3xl bg-[#d9d9d9] shadow-none">
                <div className="relative aspect-1200/410 min-h-[220px] w-full sm:min-h-[260px] md:min-h-[300px] lg:min-h-0">
                  <img
                    src={heroBannerSrc}
                    alt=""
                    width={1200}
                    height={410}
                    className={`absolute inset-0 size-full ${heroBannerIsStock ? "object-fill object-center" : "object-cover object-center"}`}
                  />
                  <div className="relative z-1 flex h-full items-center pt-6 pr-6 pb-12 pl-8 md:pr-24 md:pl-24 lg:pb-12 lg:pl-32 lg:pr-24">
                    <img
                      src={heroLogoSrc}
                      alt=""
                      width={338}
                      height={338}
                      className="max-h-[min(200px,46%)] w-auto max-w-[min(280px,48%)] object-contain object-left md:max-h-[min(280px,58%)] md:max-w-[42%] lg:max-h-[min(338px,82%)] lg:max-w-none"
                    />
                  </div>
                </div>
              </div>

              {/* Floating bar — Figma 8549:211664 + 8549:202434 (px-80 inset, h-97, radius 32) */}
              <div className="relative z-2 flex w-full max-w-full justify-center px-0 sm:px-4 md:px-10 lg:px-20">
                <div className="flex min-h-[88px] w-full max-w-full flex-col gap-4 rounded-[32px] bg-white px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.15)] sm:h-[97px] sm:min-h-[97px] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0 md:px-12 lg:px-20">
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
                    <p
                      className={`${dmSans.style.fontFamily} w-full min-w-0 truncate font-semibold text-[#3b3b3b] text-2xl leading-tight sm:text-3xl lg:text-[40px] lg:leading-none`}
                    >
                      {offer?.offer_name_display || offer?.offer_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {offer?._id ? (
                      <IconButton
                        disabled={loadingFav}
                        onClick={() => {
                          mutateFav({ offer_id: offer?._id });
                        }}
                        sx={{
                          width: 44,
                          height: 44,
                          border: "1px solid #E6F7ED",
                          background: "#E6F7ED",
                          borderRadius: "999px",
                        }}
                        aria-label="Favorite"
                      >
                        <FavoriteIcon
                          sx={{
                            fontSize: 22,
                            color: getFavouriteOffer?.data
                              ?.map((item) => item?.offer_id?._id.toString())
                              .includes(offer?._id?.toString())
                              ? "#00cc99"
                              : "#686868",
                          }}
                        />
                      </IconButton>
                    ) : null}
                    <Button
                      uiVariant="dark"
                      uiSize="lg"
                      bgColor="#3b3b3b"
                      fontSize="18px"
                      fontWeight={600}
                      disabled={loadingGenerateDeeplink}
                      onClick={() => {
                        openLinkOffer();
                      }}
                      className="h-12 w-full min-w-0 rounded-full px-6 sm:w-[200px] sm:min-w-[200px] sm:shrink-0"
                    >
                      {merchantDetailExperiment.shop_now_label || t("Shop Now")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-12 lg:grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start lg:gap-x-20">
            {/*
             * Left rail — single stack (cashback → tracking → terms), mirrors right rail grouping.
             */}
            <div className="flex min-w-0 flex-col gap-14">
              <div className="flex flex-col gap-6">
                <div className="flex items-end justify-between gap-4">
                  <p className="text-[20px] leading-none text-[#7f7f7f] md:text-[24px]">
                    {t("Cashback up to")}
                  </p>
                  <p className="shrink-0 text-[40px] leading-none font-semibold text-[#00cc99] md:text-[48px]">
                    {sumPercent?.toFixed(1)}%
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {hasMerchantSummaryTags ? (
                    <div
                      className="flex flex-wrap content-start gap-x-2 gap-y-2.5 sm:gap-x-2.5"
                      role="list"
                      aria-label={merchantSummaryTagsAriaLabel}
                    >
                      {offer?.categories ? (
                        <LocaleLink
                          href={`/category/${offer.categories}`}
                          role="listitem"
                          aria-label={t("categoryExploreHeading", { category: offer.categories })}
                          className={cn(
                            merchantSummaryTagBase,
                            "border-[#e4e4e4] bg-[#f6f6f6] text-[#3b3b3b] no-underline transition-colors hover:bg-[#ececec] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99]"
                          )}
                        >
                          <CheckroomOutlinedIcon
                            sx={{ fontSize: 18, color: "#3b3b3b" }}
                            className="shrink-0"
                          />
                          <span className="min-w-0 truncate">{offer.categories}</span>
                        </LocaleLink>
                      ) : null}
                      {Number(percentSpecial) > 0 ? (
                        <span
                          role="listitem"
                          className={cn(
                            merchantSummaryTagBase,
                            "border-[#c8ebe0] bg-[#f7fdfb] text-[#3b3b3b]"
                          )}
                        >
                          <span className="shrink-0 text-base leading-none" aria-hidden>
                            🔥
                          </span>
                          <span className="min-w-0">
                            {t("Extra Cashback")}{" "}
                            <span className="tabular-nums font-semibold text-[#00aa80]">
                              {percentSpecial}%
                            </span>
                          </span>
                        </span>
                      ) : null}
                      {activeCoupons.length > 0 ? (
                        <span
                          role="listitem"
                          className={cn(
                            merchantSummaryTagBase,
                            "border-[#f0b0b0] bg-white text-[#3b3b3b]"
                          )}
                        >
                          <span className="shrink-0 text-base leading-none" aria-hidden>
                            🧧
                          </span>
                          {t("Grab Coupon")}
                        </span>
                      ) : null}
                      {couponExpiryDays !== null ? (
                        <span
                          role="listitem"
                          className={cn(
                            merchantSummaryTagBase,
                            "border-[#f5cfcf] bg-[#fff5f5] text-[#cd0d0d]"
                          )}
                        >
                          <AccessTimeOutlinedIcon
                            sx={{ fontSize: 18, color: "#cd0d0d" }}
                            className="shrink-0"
                          />
                          <span className="min-w-0">
                            {t("Expires in")}{" "}
                            <span className="tabular-nums font-semibold">{couponExpiryDays}</span>{" "}
                            {t("Day(s)")}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2 border-t border-[#e4e4e4] pt-3">
                    <p className="text-sm leading-relaxed text-[#7f7f7f]">
                      {t("merchantCashbackRatesDisclaimer")}
                    </p>
                    {offer?.product_type && offer.product_type.length > 0 ? (
                      <>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-base text-[#3b3b3b]">
                          <span>
                            {t("Cashback starting from")}{" "}
                            {Math.min(...offer.product_type.map((item) => Number(item?.minimum)))}%
                          </span>
                          <span className="shrink-0">
                            {t("up to")}{" "}
                            {Math.max(...offer.product_type.map((item) => Number(item?.minimum)))}%
                          </span>
                        </div>
                        <div className="flex flex-col border-t border-[#e4e4e4]">
                          {[...offer.product_type]
                            .sort((a, b) => Number(a?.minimum) - Number(b?.minimum))
                            .map((product, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between gap-3 border-b border-[#e4e4e4] py-[11px] last:border-b-0"
                              >
                                <p className="text-base font-normal text-[#3b3b3b]">
                                  {product.name}
                                </p>
                                <p className="shrink-0 text-xl font-semibold leading-none text-[#3b3b3b]">
                                  {product.minimum}%
                                </p>
                              </div>
                            ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-6 text-xl font-semibold text-[#3b3b3b]">
                  {t("Cashback Tracking Period")}
                </h2>
                <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible">
                  <div className="flex min-w-[min(100%,520px)] items-start justify-between gap-1 sm:min-w-0">
                    <div className="flex max-w-[33%] flex-1 flex-col items-center gap-2 text-center sm:max-w-[120px] sm:flex-none">
                      <ShoppingBagOutlinedIcon sx={{ fontSize: 24, color: "#7f7f7f" }} />
                      <div className="text-xs leading-tight font-medium text-[#3b3b3b]">
                        <span className="block">{t("merchantTrackingPurchase")}</span>
                        <span className="block text-[#7f7f7f]">
                          {t("merchantTrackingWithGoGoCash")}
                        </span>
                      </div>
                    </div>
                    <div
                      className="mx-1 mt-3 hidden h-0 min-w-4 flex-1 border-b border-[#e4e4e4] sm:block"
                      aria-hidden
                    />
                    <div className="flex max-w-[33%] flex-1 flex-col items-center gap-2 text-center sm:max-w-[120px] sm:flex-none">
                      <CheckCircleIcon sx={{ fontSize: 24, color: "#7f7f7f" }} />
                      <div className="text-xs leading-tight font-medium text-[#3b3b3b]">
                        <span className="block">{t("Tracking")}</span>
                        <span className="block text-[#7f7f7f]">
                          {t("within")} {offer?.validation_terms} {t("day")}
                        </span>
                      </div>
                    </div>
                    <div
                      className="mx-1 mt-3 hidden h-0 min-w-4 flex-1 border-b border-[#e4e4e4] sm:block"
                      aria-hidden
                    />
                    <div className="flex max-w-[33%] flex-1 flex-col items-center gap-2 text-center sm:max-w-[120px] sm:flex-none">
                      <BankIcon fill="#7f7f7f" width="24" height="24" />
                      <div className="text-xs leading-tight font-medium text-[#3b3b3b]">
                        <span className="block">{t("Confirm")}</span>
                        <span className="block text-[#7f7f7f]">
                          {t("within")} {offer?.payment_terms} {t("day")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-semibold text-[#3b3b3b]">
                  {t("Terms and exclusions")}
                </h2>
                {termSections.map((item, index) => {
                  return (
                    <Accordion
                      key={index}
                      defaultExpanded={index === 0}
                      disableGutters
                      elevation={0}
                      sx={{
                        border: "1px solid #b7e7db",
                        borderRadius: "12px",
                        boxShadow: "0px 4px 6px rgba(0,0,0,0.05)",
                        mb: 2,
                        bgcolor: "#fff",
                        overflow: "hidden",
                        "&.Mui-expanded": {
                          bgcolor: "#fff",
                          margin: "0 0 16px 0",
                        },
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: "#3b3b3b" }} />}
                        aria-controls={`shop-term-${index}-content`}
                        id={`shop-term-${index}-header`}
                        sx={{
                          "& .MuiAccordionSummary-content": {
                            alignItems: "center",
                            columnGap: "8px",
                            margin: "12px 0",
                          },
                        }}
                      >
                        <HelpOutlineOutlinedIcon
                          sx={{ fontSize: 20, color: "#00cc99", flexShrink: 0 }}
                        />
                        <span
                          className={`${dmSans.style.fontFamily} text-left font-semibold text-[#3b3b3b] text-base`}
                        >
                          {item.title}
                        </span>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                        {item.subtitle ? (
                          <p className={`${dmSans.className} text-sm text-[#3b3b3b]`}>
                            {item.subtitle}
                          </p>
                        ) : null}
                        <ul className="mt-2 list-disc pl-4">
                          {item.description.map((desc, descIndex) => {
                            return (
                              <li key={descIndex} className="mb-2 text-sm text-[#7f7f7f]">
                                <p className={`${dmSans.className}`}>{desc}</p>
                              </li>
                            );
                          })}
                        </ul>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </div>
            </div>

            {/*
             * Coupons + Cashback tips (right rail)
             * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8549-202483
             */}
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
                                  src="/discount.png"
                                  alt=""
                                  width={100}
                                  height={100}
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
                                    <h3 className="text-2xl font-semibold text-[#00cc99]">
                                      {coupon.name}
                                    </h3>
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

                {/*
                 * Cashback tips — Figma Coupon Tips (8549:202493)
                 * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8549-202493
                 */}
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

                  <div className="flex w-full min-w-0 flex-col gap-4">
                    <div className="relative w-full overflow-visible rounded-2xl bg-[#ecfcf8] px-4 pb-6 pt-12 sm:px-6 sm:pt-14">
                      <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 sm:gap-3">
                        <WarningAmberOutlinedIcon
                          sx={{ fontSize: { xs: 24, sm: 28 }, color: "#f5a623" }}
                          aria-hidden
                        />
                        <span className="whitespace-nowrap rounded-full bg-[#00aa80] px-5 py-2.5 text-center text-base font-semibold text-white sm:px-8 sm:py-3 sm:text-2xl">
                          {t("excludedProductsLabel")}
                        </span>
                        <WarningAmberOutlinedIcon
                          sx={{ fontSize: { xs: 24, sm: 28 }, color: "#f5a623" }}
                          aria-hidden
                        />
                      </div>
                      <p className="text-center text-base leading-normal text-[#3b3b3b] sm:text-xl">
                        {t("excludedProductsTipLead")}
                        <span className="mx-0.5 inline-block rounded-lg bg-[#ff4c4c] px-1.5 py-0.5 align-middle text-sm font-semibold text-white sm:text-xl sm:leading-snug">
                          {t("excludedProductsTipEmphasis")}
                        </span>
                      </p>
                      <div className="mt-6 flex flex-wrap justify-center gap-4">
                        {(
                          [
                            { label: t("merchantTipShopFromLive"), key: "live" },
                            { label: t("merchantTipShopFromVideo"), key: "video" },
                          ] as const
                        ).map((slot) => (
                          <div
                            key={slot.key}
                            className="flex w-[min(148px,42vw)] flex-col items-center rounded-lg border-[1.5px] border-[#3b3b3b] bg-[#ebebeb] p-3 shadow-[4px_4px_8px_rgba(0,0,0,0.2)]"
                          >
                            <div className="mb-2 flex aspect-square w-[min(72px,22vw)] items-center justify-center rounded-md bg-[#fce4ec]">
                              <CheckroomOutlinedIcon sx={{ fontSize: 32, color: "#c2185b" }} />
                            </div>
                            <span className="rounded-lg border-2 border-[#3b3b3b] bg-white px-2 py-1 text-center text-xs font-semibold text-[#3b3b3b] shadow-[4px_4px_8px_rgba(0,0,0,0.2)]">
                              {slot.label}
                            </span>
                            <CancelOutlinedIcon
                              sx={{ fontSize: 24, color: "#e93636", mt: 1 }}
                              aria-hidden
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {cashbackTipItems.map((item, index) => (
                      <div
                        key={index}
                        className={`flex w-full flex-col gap-2 rounded-2xl bg-[#ecfcf8] px-6 py-4 ${
                          item.decor === "shopFlow"
                            ? "relative min-h-0 overflow-visible pb-6 md:min-h-[260px] md:pb-4"
                            : item.decor === "adAlerts"
                              ? "overflow-hidden"
                              : ""
                        }`}
                      >
                        <h3 className="w-full text-lg font-semibold text-[#3b3b3b]">
                          {item.title}
                        </h3>
                        <div
                          className={
                            item.decor === "adAlerts"
                              ? "flex flex-col gap-2 md:flex-row md:items-start md:gap-4"
                              : "flex flex-col gap-2 md:flex-row md:items-start md:gap-6"
                          }
                        >
                          <p className="min-w-0 flex-1 text-sm leading-normal text-[#7f7f7f]">
                            {item.description}
                          </p>
                          {item.decor === "shopFlow" ? (
                            <div
                              className="relative flex shrink-0 flex-row items-center justify-center gap-2 self-center md:absolute md:bottom-4 md:right-6 md:flex-col md:gap-2"
                              aria-hidden
                            >
                              <div className="flex items-center gap-1.5 rounded-2xl border-2 border-[#3b3b3b] bg-white px-2 py-1.5 shadow-[4px_4px_8px_rgba(0,0,0,0.2)]">
                                <TouchAppOutlinedIcon sx={{ fontSize: 20, color: "#00aa80" }} />
                                <span className="text-xs font-semibold text-[#3b3b3b]">
                                  {t("Shop Now")}
                                </span>
                              </div>
                              <EastOutlinedIcon sx={{ fontSize: 28, color: "#00cc99" }} />
                              <StorefrontOutlinedIcon sx={{ fontSize: 40, color: "#00aa80" }} />
                            </div>
                          ) : null}
                          {item.decor === "adAlerts" ? (
                            <div
                              className="relative mx-auto flex h-[110px] w-full max-w-[200px] shrink-0 items-center justify-center md:mx-0"
                              aria-hidden
                            >
                              <div className="relative flex h-[88px] w-[56px] items-center justify-center rounded-2xl border-[3px] border-[#3b3b3b] bg-linear-to-b from-white to-[#00cc99]/30 shadow-sm">
                                <PhoneIphoneOutlinedIcon sx={{ fontSize: 34, color: "#989898" }} />
                              </div>
                              <div className="absolute -top-1 -right-1 flex items-center gap-0.5 rounded-full border border-black bg-white px-1.5 py-0.5 shadow-md">
                                <span className="text-[10px] font-bold text-[#1877f2]">f</span>
                                <ErrorOutlineOutlinedIcon sx={{ fontSize: 14, color: "#e93636" }} />
                              </div>
                              <div className="absolute -bottom-0.5 -left-1 flex items-center gap-0.5 rounded-full border border-black bg-white px-1.5 py-0.5 shadow-md">
                                <span className="text-[10px] font-bold text-[#4285f4]">G</span>
                                <ErrorOutlineOutlinedIcon sx={{ fontSize: 14, color: "#e93636" }} />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ShopDetailExploreRelated
            exploreRelatedOffers={exploreRelatedOffers}
            offer={offer}
            lg={lg}
            getFavouriteOffer={getFavouriteOffer}
            loadingFav={loadingFav}
            mutateFav={mutateFav}
          />
        </>
      )}
    </section>
  );
};
export default ShopDetail;
