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
import { useMediaQuery } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";
import { generateDeeplink } from "@/lib/services/detail";
import toast from "react-hot-toast";
import { ResponseGenerateDeeplink } from "@/interfaces/shop";
import { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import { shouldUseMockApi } from "@/lib/env";
import { getPercent } from "@/lib/utils";
import LoadingShop from "./LoadingShop";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { favoriteOffer } from "@/lib/services/offer";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  trackFavoriteToggle,
  trackMerchantDetailView,
  trackMerchantRedirect,
  getCashbackValue,
} from "@/lib/analytics";
import { trackMetaViewContent, trackMetaInitiateCheckout } from "@/lib/metaPixel";
import { POSTHOG_FLAG_KEYS, usePostHogFlagPayload } from "@/lib/posthog";
import { useMerchantBrandHero } from "@/features/shop/hooks/useMerchantBrandHero";
import { GOLINK_SHOP_CONTINUE_QUERY } from "@/constants/golink";
import { ShopDetailHero } from "./ShopDetailHero";
import { ShopDetailLeftRail } from "./ShopDetailLeftRail";
import { ShopDetailRightRail } from "./ShopDetailRightRail";
import { ShopDetailTermsExclusions } from "./ShopDetailTermsExclusions";
import { getMerchantSummaryTagsAriaLabel } from "./shopDetailShared";

const ShopDetailExploreRelated = dynamic(() => import("./ShopDetailExploreRelated"), {
  loading: () => (
    <div className="mt-12 h-64 w-full animate-pulse rounded-2xl bg-[#f0f0f0] md:h-80" aria-hidden />
  ),
});

const ShopDetail = () => {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const messages = useMessages() as Record<string, unknown>;
  const merchantSummaryTagsAriaLabel = getMerchantSummaryTagsAriaLabel(messages, locale);
  const { data: session, status: sessionStatus } = useSession();
  const isMdUp = useMediaQuery("(min-width:768px)");
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
  const golinkAutoCheckoutRef = useRef(false);

  useEffect(() => {
    golinkAutoCheckoutRef.current = false;
  }, [id]);

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
    if (sessionStatus === "loading") {
      return;
    }
    if (sessionStatus === "unauthenticated") {
      if (offer) {
        trackMerchantRedirect({
          merchant: offer,
          status: "login_required",
        });
      }
      const q = pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : "";
      router.push(`/login${q}`);
      return;
    }
    if (offer) {
      trackMerchantRedirect({
        merchant: offer,
        status: "attempt",
      });

      trackMetaInitiateCheckout();

      mutateGenerateDeeplink({
        offer_id: offer?.offer_id,
        merchant_id: offer?.merchant_id,
        preview_url: offer.preview_url,
      });
    }
  };

  useEffect(() => {
    if (searchParams.get(GOLINK_SHOP_CONTINUE_QUERY) !== "1") return;
    if (!offer) return;
    if (golinkAutoCheckoutRef.current) return;
    golinkAutoCheckoutRef.current = true;
    router.replace(pathname);
    queueMicrotask(() => {
      openLinkOffer();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link from GoLink banner
  }, [offer, pathname, router, searchParams]);

  useEffect(() => {
    if (!offer?._id || trackedOfferRef.current === offer._id) return;

    trackedOfferRef.current = offer._id;
    trackMerchantDetailView({
      merchant: offer,
      sourceList: "merchant_detail",
    });

    trackMetaViewContent({
      content_name: offer.offer_name_display || offer.offer_name || "",
      content_category: "merchant",
      content_ids: [String(offer.merchant_id || offer._id)],
      value: getCashbackValue(offer) || 0,
      currency: "USD",
    });
  }, [offer]);

  const activeCoupons = useMemo(() => {
    if (!couponDetail || !(session || shouldUseMockApi())) return [];
    return couponDetail.filter(
      (coupon) => !coupon.disabled && new Date(coupon.end_date) >= new Date()
    );
  }, [couponDetail, session]);

  const [couponTick, setCouponTick] = useState(0);
  const couponNowMsRef = useRef(Date.now());

  useEffect(() => {
    if (activeCoupons.length === 0) return undefined;
    couponNowMsRef.current = Date.now();
    const timerId = window.setInterval(() => {
      couponNowMsRef.current = Date.now();
      setCouponTick((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(timerId);
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

  const exploreRelatedOffers = useMemo(
    () => (offers?.data ?? []).filter((o) => o._id !== offer?._id).slice(0, 8),
    [offers?.data, offer?._id]
  );

  const { heroBannerSrc, heroLogoSrc, heroBannerIsStock } = useMerchantBrandHero(offer, isMdUp);

  return (
    <section className="w-full pt-6 md:pt-8 lg:pt-10">
      {showOpenLinkLoading ? (
        <LoadingShop offer={offer} openLinkOffer={openLinkOffer} />
      ) : (
        <>
          <ShopDetailHero
            offer={offer}
            heroBannerSrc={heroBannerSrc}
            heroLogoSrc={heroLogoSrc}
            heroBannerIsStock={heroBannerIsStock}
            loadingFav={loadingFav}
            loadingGenerateDeeplink={loadingGenerateDeeplink}
            getFavouriteOffer={getFavouriteOffer}
            mutateFav={mutateFav}
            openLinkOffer={openLinkOffer}
            shopNowLabel={merchantDetailExperiment.shop_now_label}
            shopNowFallback={t("Shop Now")}
          />

          {/**
           * Mobile: left summary → right rail (coupons + Cashback Tips) → terms.
           * lg+: left column = summary + terms (stacked); right column spans both rows.
           */}
          <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start lg:gap-x-20">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <ShopDetailLeftRail
                offer={offer}
                sumPercent={sumPercent}
                hasMerchantSummaryTags={hasMerchantSummaryTags}
                merchantSummaryTagsAriaLabel={merchantSummaryTagsAriaLabel}
                activeCouponCount={activeCoupons.length}
                couponExpiryDays={couponExpiryDays}
                percentSpecial={Number(percentSpecial)}
              />
            </div>

            <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
              <ShopDetailRightRail
                locale={locale}
                activeCoupons={activeCoupons}
                couponTick={couponTick}
                offer={offer}
              />
            </div>

            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <ShopDetailTermsExclusions />
            </div>
          </div>

          <ShopDetailExploreRelated
            exploreRelatedOffers={exploreRelatedOffers}
            offer={offer}
            lg={isMdUp}
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
