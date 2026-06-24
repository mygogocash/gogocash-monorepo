import { type ImageSourcePropType } from "react-native";

import { type TopBrandCard } from "@mobile/account/topBrandResource";
import {
  getResponsiveHomeLayoutMetrics,
  webHomeSearchPopularPanel,
} from "@mobile/design/webDesignParity";

import { type brandLogoAssets } from "./homeAssets";

export type HomeLayoutMetrics = ReturnType<typeof getResponsiveHomeLayoutMetrics>;

export type CompactBrandLogoOfferCardProps = {
  readonly brand: string;
  readonly cashback: string;
  readonly href?: string;
  readonly logoAsset?: keyof typeof brandLogoAssets;
  readonly logoFallbackText?: string;
  readonly logoUri?: string;
  readonly tint: string;
};

export type HomeSearchPanelItem = (typeof webHomeSearchPopularPanel.items)[number];

// Widened to TopBrandCard so backend-resolved cards (non-literal strings) and the
// `as const` fixture both satisfy it.
export type TopBrandCardProps = TopBrandCard;

export type DesktopGoLinkBannerProps = {
  readonly onOpenGuideline: () => void;
  readonly onResultHref: (href: string) => void;
  readonly variant?: "default" | "mobileTabletHeader";
};

export type MobileTabletHomeHeaderProps = {
  greetingName?: string;
  readonly homeLayout: HomeLayoutMetrics;
  readonly isGoLinkCovered: boolean;
  readonly onOpenGoLinkGuideline: () => void;
  readonly onOpenSearchPopover: () => void;
  readonly onGoLinkResultHref: (href: string) => void;
};

export type HeroBannerAssetKey = string;

export type HeroBannerSource = ImageSourcePropType | undefined;
