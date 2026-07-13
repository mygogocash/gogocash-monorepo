import { useEffect, useState } from "react";
import { Linking } from "react-native";

import { mintUserTrackingLink } from "@mobile/api/affiliateDeeplink";
import {
  fetchGoLinkPreview,
  type GoLinkProductPreview,
} from "@mobile/api/golinkPreview";
import { getMobileEnv } from "@mobile/config/env";
import {
  buildGoLinkTrackingUrl,
  matchGoLinkOffer,
  type GoLinkOfferLike,
} from "@mobile/features/golinkResolve";
import { useRegion } from "@mobile/i18n/LocaleProvider";

export type GoLinkResolutionState = {
  offer: GoLinkOfferLike | null;
  status: "loading" | "matched" | "unmatched";
};

const EMPTY_PRODUCT_PREVIEW: GoLinkProductPreview = {
  title: null,
  imageUrl: null,
  description: null,
  price: null,
};

/**
 * Live merchant resolution for a pasted GoGoLink URL — shared by EVERY
 * GoLinkResultDialog caller (the /golink screen, its home-sheet presentation,
 * and the home hero card). Regression note: the home hero originally rendered
 * the dialog without this wiring and silently fell back to the demo product
 * in backend mode.
 *
 * Product OG preview (#255/#258) loads in parallel after a merchant match and
 * degrades silently to merchant-only when the preview endpoint fails.
 */
export function useGoLinkResolution(open: boolean, href: string): {
  live: boolean;
  match: GoLinkResolutionState;
  productPreview: GoLinkProductPreview;
} {
  const env = getMobileEnv();
  const live = env.accountDataSource === "backend";
  const { region } = useRegion();
  const [match, setMatch] = useState<GoLinkResolutionState>({
    offer: null,
    status: "loading",
  });
  const [productPreview, setProductPreview] =
    useState<GoLinkProductPreview>(EMPTY_PRODUCT_PREVIEW);

  useEffect(() => {
    if (!open || !href || !live) {
      return;
    }
    let active = true;
    setMatch({ offer: null, status: "loading" });
    setProductPreview(EMPTY_PRODUCT_PREVIEW);
    (async () => {
      try {
        const params = new URLSearchParams({ limit: "100", page: "1" });
        if (region) {
          params.set("country", region);
        }
        const response = await fetch(`${env.apiUrl}/offer?${params.toString()}`, {
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as { data?: GoLinkOfferLike[] };
        const offer = matchGoLinkOffer(href, payload?.data ?? []);
        if (active) {
          setMatch({ offer, status: offer ? "matched" : "unmatched" });
        }
        if (offer && active) {
          const preview = await fetchGoLinkPreview({
            apiUrl: env.apiUrl,
            url: href,
          });
          if (active) {
            setProductPreview(preview);
          }
        }
      } catch {
        // Resolution failure degrades to the honest "not supported" state —
        // never a fake product.
        if (active) {
          setMatch({ offer: null, status: "unmatched" });
          setProductPreview(EMPTY_PRODUCT_PREVIEW);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [env.apiUrl, href, live, open, region]);

  return { live, match, productPreview };
}

/**
 * Per-user, product-targeted Shop Now: mints an aff_sub=user_id:<id> tracking
 * link (same endpoint production web uses) and appends the pasted product URL
 * as the Involve `url` deeplink param. Any failure falls back to the offer's
 * raw tracking link — the shopper is never dead-ended; only attribution
 * degrades.
 */
export async function openGoLinkTracked(
  offer: GoLinkOfferLike,
  pastedUrl: string,
  { accessToken, apiUrl }: { accessToken: string | undefined; apiUrl: string },
): Promise<void> {
  const fallback = buildGoLinkTrackingUrl(offer.tracking_link ?? "", pastedUrl);
  const minted = await mintUserTrackingLink({
    accessToken,
    apiUrl,
    deeplink: pastedUrl,
    merchantId: offer.merchant_id,
    offerId: offer.offer_id,
  });
  const target = minted ? buildGoLinkTrackingUrl(minted, pastedUrl) : fallback;
  if (target) {
    await Linking.openURL(target).catch(() => undefined);
  }
}
