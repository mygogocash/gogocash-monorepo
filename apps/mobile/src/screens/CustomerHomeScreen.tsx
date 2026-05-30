import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useRouter } from "expo-router";
import {
  AirplaneTilt,
  BookOpen as BookOpenIcon,
  ChevronRight as ChevronRightIcon,
  CircleUserRound as ProfileIcon,
  DeviceMobile,
  Grid2X2 as GridIcon,
  Heart as HeartIcon,
  Heartbeat,
  Home as HomeIcon,
  type IconComponent,
  Info as InfoIcon,
  Link2 as LinkIcon,
  Search as SearchIcon,
  ShoppingBag as ShoppingBagIcon,
  SquaresFour,
  Store as StoreIcon,
  Storefront,
  Tag,
  Tags as TagsIcon,
  TrendingUp as TrendingUpIcon,
  Trophy as TrophyIcon,
  WalletCards as WalletIcon,
} from "@mobile/theme/icons";
import {
  Animated,
  Image,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  TextInput,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import homeBannerImage from "../../assets/home-banner.png";
import golinkBannerIllustrationImage from "../../assets/golink-banner-illustration.png";
import logoMarkImage from "../../assets/nav/logo.png";
import menuFireImage from "../../assets/nav/menu-fire.png";
import questHeaderImage from "../../assets/nav/quest-header.png";
import sideGroceryImage from "../../assets/home-side-grocery.png";
import sideWatchImage from "../../assets/home-side-watch.png";
import lazadaLogo from "../../assets/partner-lazada.png";
import sheinLogo from "../../assets/partner-shein.png";
import shopeeLogo from "../../assets/partner-shopee.png";
import {
  CustomerGoLinkScreen,
  GoLinkGuidelineDialog,
  GoLinkResultDialog,
} from "@mobile/screens/CustomerGoLinkScreen";
import { CustomerDesktopHeader } from "@mobile/components/CustomerDesktopHeader";
import { CustomerLocaleRegionControl } from "@mobile/components/CustomerLocaleRegionControl";
import { CustomerSignInNavGraphic } from "@mobile/components/CustomerSignInNavGraphic";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerCookieConsentBanner } from "@mobile/components/CustomerCookieConsentBanner";
import { CustomerLineOfficialFab } from "@mobile/components/CustomerLineOfficialFab";
import {
  getCarouselActiveIndex,
  getCarouselDotCount,
  getDesktopShellHorizontalPadding,
  getHomeSearchMatches,
  getResponsiveHomeLayoutMetrics,
  getTopBrandHref,
  mobileShellLayout,
  webBrowseShortcuts,
  webDesktopHeaderNavItems,
  webGoLinkFeature,
  webHomeHeroBanners,
  webHomePromoSections,
  webHomeSectionOrder,
  webHomeSearchPopularPanel,
  webHomeSearchPlaceholder,
  webMobileBottomNavItems,
  webTopBrandCards,
} from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { isValidGoLinkUrl } from "@mobile/features/golink";
import { motion } from "@mobile/theme/motion";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type HomeIconComponent = IconComponent;

const heroBannerAssets: Record<string, ImageSourcePropType> = {
  "home-banner": homeBannerImage,
  "home-side-grocery": sideGroceryImage,
  "home-side-watch": sideWatchImage,
};

const brandLogoAssets: Record<string, ImageSourcePropType> = {
  lazada: lazadaLogo,
  shein: sheinLogo,
  shopee: shopeeLogo,
};

const shortcutIcons: Record<string, HomeIconComponent> = {
  education: BookOpenIcon,
  promotion: TagsIcon,
  shop: StoreIcon,
  shops: GridIcon,
};

const desktopNavIcons: Record<string, IconComponent> = {
  electronics: DeviceMobile,
  health: Heartbeat,
  promotion: Tag,
  shop: Storefront,
  shops: SquaresFour,
  travel: AirplaneTilt,
};

const bottomNavIcons: Record<string, HomeIconComponent> = {
  golink: LinkIcon,
  home: HomeIcon,
  profile: ProfileIcon,
  quest: TrophyIcon,
  wallet: WalletIcon,
};

const homeIconStrokeWidth = typography.iconStrokeWidth;
const webSearchInputFocusReset = {
  outlineStyle: "none",
  outlineWidth: 0,
} as unknown as TextStyle;

type CompactBrandLogoOfferCardProps = {
  readonly brand: string;
  readonly cashback: string;
  readonly logoAsset?: keyof typeof brandLogoAssets;
  readonly logoFallbackText?: string;
  readonly logoUri?: string;
  readonly tint: string;
};
type HomeSearchPanelItem = (typeof webHomeSearchPopularPanel.items)[number];
type TopBrandCardProps = (typeof webTopBrandCards)[number];
type HomeHeroBanner = (typeof webHomeHeroBanners)[number];
type HomeLayoutMetrics = ReturnType<typeof getResponsiveHomeLayoutMetrics>;
type DesktopGoLinkBannerProps = {
  readonly onOpenGuideline: () => void;
  readonly onResultHref: (href: string) => void;
};
const viewAllLabel = "View all  →";
const homeGoLinkShopNowRoute = "/shop/brand-orbit-airways-1003?golinkContinue=1";

function brandHref(brand: string) {
  return getTopBrandHref(brand);
}

function chunkTopBrandCards(cards: readonly TopBrandCardProps[], pageSize: number) {
  const topBrandPages: TopBrandCardProps[][] = [];

  for (let index = 0; index < cards.length; index += pageSize) {
    topBrandPages.push(cards.slice(index, index + pageSize));
  }

  return topBrandPages;
}

function chunkCompactBrandCards(
  cards: readonly CompactBrandLogoOfferCardProps[],
  pageSize: number
) {
  const promoPages: CompactBrandLogoOfferCardProps[][] = [];

  for (let index = 0; index < cards.length; index += pageSize) {
    promoPages.push(cards.slice(index, index + pageSize));
  }

  return promoPages;
}

function getPagedScrollIndex(
  event: NativeSyntheticEvent<NativeScrollEvent>,
  pageWidth: number,
  maxPageIndex: number
) {
  return getCarouselActiveIndex({
    contentOffsetX: event.nativeEvent.contentOffset.x,
    pageCount: maxPageIndex + 1,
    pageWidth,
  });
}

export function CustomerHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const [desktopGoLinkGuidelineOpen, setDesktopGoLinkGuidelineOpen] = useState(false);
  const [desktopGoLinkResultHref, setDesktopGoLinkResultHref] = useState("");
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
  const [searchPopoverMounted, setSearchPopoverMounted] = useState(false);
  const [goLinkSheetOpen, setGoLinkSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTopPadding = Math.max(8, insets.top + 8);
  const searchPopoverTop = searchTopPadding + 62;
  const openSearchPopover = useCallback(() => {
    setSearchPopoverMounted(true);
    setSearchPopoverOpen(true);
  }, []);
  const closeSearchPopover = useCallback(() => {
    setSearchPopoverOpen(false);
  }, []);
  const handleSearchPopoverExited = useCallback(() => {
    setSearchPopoverMounted(false);
  }, []);
  const handleDesktopGoLinkShopNow = useCallback(() => {
    setDesktopGoLinkResultHref("");
    router.push(homeGoLinkShopNowRoute as never);
  }, [router]);

  return (
    <View style={styles.viewport}>
      <View style={[styles.phoneFrame, { maxWidth: homeLayout.contentMaxWidth }]}>
        {homeLayout.isDesktop ? <CustomerDesktopHeader viewportWidth={width} /> : null}
        {homeLayout.isDesktop ? null : (
          <View
            style={[
              styles.stickySearch,
              {
                paddingHorizontal: homeLayout.contentHorizontalPadding,
                paddingTop: searchTopPadding,
              },
            ]}
          >
            <MotionPressable
              onPress={openSearchPopover}
              pressScale={motion.scale.subtlePress}
              style={[styles.searchPill, searchPopoverOpen ? styles.searchPillActive : null]}
            >
              <SearchIcon color={colors.primaryDark} size={20} strokeWidth={homeIconStrokeWidth} />
              <TextInput
                accessibilityLabel="Search brands, stores, products, and cashback offers"
                nativeID="home-search-input"
                onBlur={() => undefined}
                onChangeText={setSearchQuery}
                onFocus={openSearchPopover}
                onPressIn={openSearchPopover}
                placeholder={webHomeSearchPlaceholder}
                placeholderTextColor={colors.textSoft}
                style={[styles.searchInput, webSearchInputFocusReset]}
                testID="home-search-input"
                value={searchQuery}
              />
            </MotionPressable>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles.page,
            homeLayout.isDesktop ? styles.pageDesktop : null,
            {
              paddingBottom: homeLayout.pageBottomPadding,
              paddingHorizontal: homeLayout.contentHorizontalPadding,
              paddingTop: homeLayout.isDesktop
                ? mobileShellLayout.desktopHomeTopGap
                : mobileShellLayout.contentTopGap,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {webHomeSectionOrder.includes("browseShortcuts") ? (
            homeLayout.isDesktop ? null : (
              <BrowseShortcuts />
            )
          ) : null}
          {webHomeSectionOrder.includes("banner") ? (
            <HomeHeroBanners homeLayout={homeLayout} />
          ) : null}
          {homeLayout.isDesktop ? (
            <DesktopGoLinkBanner
              onOpenGuideline={() => setDesktopGoLinkGuidelineOpen(true)}
              onResultHref={setDesktopGoLinkResultHref}
            />
          ) : null}
          {webHomeSectionOrder.includes("extra") ? (
            <TopBrandSection homeLayout={homeLayout} />
          ) : null}
          {webHomePromoSections.map((section) => (
            <PromoSection homeLayout={homeLayout} key={section.id} {...section} />
          ))}
          {homeLayout.isDesktop ? (
            <CustomerDesktopFooter
              horizontalPadding={homeLayout.contentHorizontalPadding}
              viewportWidth={width}
            />
          ) : null}
        </ScrollView>

        {homeLayout.showBottomNav ? (
          <CustomerMobileBottomNav
            bottomInset={insets.bottom}
            onGoLinkPress={() => setGoLinkSheetOpen(true)}
          />
        ) : null}
        {searchPopoverMounted ? (
          <HomeSearchPopularPopover
            horizontalPadding={homeLayout.contentHorizontalPadding}
            onClose={closeSearchPopover}
            onExited={handleSearchPopoverExited}
            query={searchQuery}
            top={searchPopoverTop}
            visible={searchPopoverOpen}
          />
        ) : null}
        {goLinkSheetOpen ? (
          <CustomerGoLinkScreen
            onClose={() => setGoLinkSheetOpen(false)}
            presentation="homeSheet"
          />
        ) : null}
        {homeLayout.isDesktop && desktopGoLinkGuidelineOpen ? (
          <GoLinkGuidelineDialog onClose={() => setDesktopGoLinkGuidelineOpen(false)} />
        ) : null}
        {homeLayout.isDesktop && desktopGoLinkResultHref ? (
          <GoLinkResultDialog
            href={desktopGoLinkResultHref}
            onClose={() => setDesktopGoLinkResultHref("")}
            onShopNow={handleDesktopGoLinkShopNow}
          />
        ) : null}
      </View>
      <CustomerCookieConsentBanner isDesktop={homeLayout.isDesktop} />
      {homeLayout.isDesktop ? <CustomerLineOfficialFab /> : null}
    </View>
  );
}

function HomeSearchPopularPopover({
  horizontalPadding,
  onClose,
  onExited,
  query,
  top,
  visible,
}: {
  horizontalPadding: number;
  onClose: () => void;
  onExited: () => void;
  query: string;
  top: number;
  visible: boolean;
}) {
  const searchMatches = getHomeSearchMatches(query);
  const hasSearchQuery = query.trim().length > 0;
  const popoverOpacity = useMemo(() => new Animated.Value(0), []);
  const popoverTranslateY = useMemo(() => new Animated.Value(-8), []);

  useEffect(() => {
    popoverOpacity.stopAnimation();
    popoverTranslateY.stopAnimation();

    if (visible) {
      Animated.parallel([
        Animated.timing(popoverOpacity, {
          duration: motion.duration.base,
          easing: motion.easing.out,
          toValue: 1,
          useNativeDriver: motion.useNativeDriver,
        }),
        Animated.timing(popoverTranslateY, {
          duration: motion.duration.base,
          easing: motion.easing.out,
          toValue: 0,
          useNativeDriver: motion.useNativeDriver,
        }),
      ]).start();

      return () => {
        popoverOpacity.stopAnimation();
        popoverTranslateY.stopAnimation();
      };
    }

    Animated.parallel([
      Animated.timing(popoverOpacity, {
        duration: motion.duration.fast,
        easing: motion.easing.in,
        toValue: 0,
        useNativeDriver: motion.useNativeDriver,
      }),
      Animated.timing(popoverTranslateY, {
        duration: motion.duration.fast,
        easing: motion.easing.in,
        toValue: -8,
        useNativeDriver: motion.useNativeDriver,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onExited();
      }
    });

    return () => {
      popoverOpacity.stopAnimation();
      popoverTranslateY.stopAnimation();
    };
  }, [onExited, popoverOpacity, popoverTranslateY, visible]);

  return (
    <View style={[styles.searchPopoverLayer, { pointerEvents: visible ? "box-none" : "none" }]}>
      <Pressable
        accessibilityLabel="Close search suggestions"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.searchPopoverBackdrop}
      />
      <Animated.View
        style={[
          styles.searchPopoverPosition,
          {
            left: horizontalPadding,
            opacity: popoverOpacity,
            right: horizontalPadding,
            top,
            transform: [{ translateY: popoverTranslateY }],
          },
        ]}
      >
        <View style={styles.searchPopover}>
          <ScrollView
            contentContainerStyle={styles.searchPopoverContent}
            showsVerticalScrollIndicator={false}
            style={styles.searchPopoverScroll}
          >
            {hasSearchQuery ? (
              <View style={styles.searchTypedContent}>
                {searchMatches.length > 0 ? (
                  <>
                    <View style={styles.searchResultsHeading}>
                      <Text style={styles.searchResultsTitle}>
                        {webHomeSearchPopularPanel.resultsTitle}
                      </Text>
                      <Text style={styles.searchResultsSubtitle}>
                        {webHomeSearchPopularPanel.resultsSubtitle}
                      </Text>
                    </View>
                    <View style={styles.searchResultListCompact}>
                      {searchMatches.map((item) => (
                        <HomeSearchResultRow item={item} key={item.brand} variant="compact" />
                      ))}
                    </View>
                    <View style={styles.searchDivider} />
                  </>
                ) : (
                  <Text style={styles.searchNoMatchCard}>
                    {webHomeSearchPopularPanel.noMatches}
                  </Text>
                )}
                <HomeSearchIntro variant="compact" />
                <View style={styles.searchResultListCompact}>
                  {webHomeSearchPopularPanel.items.map((item) => (
                    <HomeSearchResultRow item={item} key={item.brand} variant="compact" />
                  ))}
                </View>
              </View>
            ) : (
              <>
                <HomeSearchIntro variant="large" />
                <View style={styles.searchResultList}>
                  {webHomeSearchPopularPanel.items.map((item) => (
                    <HomeSearchResultRow item={item} key={item.brand} variant="large" />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

function HomeSearchIntro({ variant }: { variant: "compact" | "large" }) {
  const compact = variant === "compact";

  return (
    <View style={[styles.searchPopoverIntro, compact ? styles.searchPopoverIntroCompact : null]}>
      <View style={[styles.searchTrendingIcon, compact ? styles.searchTrendingIconCompact : null]}>
        <TrendingUpIcon color={colors.primaryDark} size={compact ? 20 : 24} strokeWidth={2.2} />
      </View>
      <View style={styles.searchIntroCopy}>
        <Text
          style={[styles.searchPopoverTitle, compact ? styles.searchPopoverTitleCompact : null]}
        >
          {webHomeSearchPopularPanel.title}
        </Text>
        <Text
          style={[
            styles.searchPopoverSubtitle,
            compact ? styles.searchPopoverSubtitleCompact : null,
          ]}
        >
          {webHomeSearchPopularPanel.subtitle}
        </Text>
      </View>
    </View>
  );
}

function HomeSearchResultRow({
  item,
  variant,
}: {
  item: HomeSearchPanelItem;
  variant: "compact" | "large";
}) {
  const compact = variant === "compact";

  return (
    <Link asChild href={brandHref(item.brand) as never}>
      <MotionPressable
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([
          styles.searchResultRow,
          compact ? styles.searchResultRowCompact : null,
        ])}
      >
        <View
          style={[
            styles.searchResultLogo,
            compact ? styles.searchResultLogoCompact : null,
            { backgroundColor: item.logoBackground },
          ]}
        >
          <Text
            style={[
              styles.searchResultLogoText,
              compact ? styles.searchResultLogoTextCompact : null,
              { color: item.logoTextColor },
            ]}
          >
            {item.logoText}
          </Text>
        </View>
        <View style={styles.searchResultCopy}>
          <Text
            numberOfLines={1}
            style={[styles.searchResultName, compact ? styles.searchResultNameCompact : null]}
          >
            {item.brand}
          </Text>
          <View style={styles.searchResultCashbackRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.searchResultCaption,
                compact ? styles.searchResultCaptionCompact : null,
              ]}
            >
              Cashback up to
            </Text>
            <Text
              style={[
                styles.searchResultCashback,
                compact ? styles.searchResultCashbackCompact : null,
              ]}
            >
              {item.cashback}
            </Text>
          </View>
        </View>
        <View
          style={[styles.searchResultAction, compact ? styles.searchResultActionCompact : null]}
        >
          <Text
            style={[
              styles.searchResultActionText,
              compact ? styles.searchResultActionTextCompact : null,
            ]}
          >
            {webHomeSearchPopularPanel.actionLabel}
          </Text>
        </View>
      </MotionPressable>
    </Link>
  );
}

function DesktopHeader({ viewportWidth }: { viewportWidth: number }) {
  const shellPadding = getDesktopShellHorizontalPadding(viewportWidth);
  const shellContentWidth = Math.min(viewportWidth, mobileShellLayout.desktopContentMaxWidth);
  const shellOffset = Math.max(0, (viewportWidth - shellContentWidth) / 2);
  const [localePanelOpen, setLocalePanelOpen] = useState(false);

  return (
    <View
      style={[
        styles.desktopShell,
        {
          marginLeft: -shellOffset,
          width: viewportWidth,
        },
      ]}
    >
      <View
        style={[
          styles.desktopHeader,
          localePanelOpen ? styles.desktopHeaderOverlayLayer : null,
        ]}
      >
        <View
          style={[
            styles.desktopHeaderContent,
            { paddingHorizontal: shellPadding, width: shellContentWidth },
          ]}
        >
          <Link asChild href="/">
            <MotionPressable pressScale={motion.scale.subtlePress} style={styles.desktopLogoLink}>
              <Image
                alt="GoGoCash logo"
                accessibilityLabel="GoGoCash logo"
                source={logoMarkImage}
                style={styles.desktopLogoMark}
              />
              <Text style={styles.desktopLogoText}>GoGoCash</Text>
            </MotionPressable>
          </Link>
          <View style={styles.desktopHeaderActions}>
            <Link asChild href="/quest">
              <MotionPressable
                accessibilityLabel="Quest"
                pressScale={motion.scale.subtlePress}
                style={styles.desktopQuestPill}
              >
                <Image
                  alt="Quest"
                  accessibilityLabel="Quest"
                  resizeMode="cover"
                  source={questHeaderImage}
                  style={styles.desktopQuestImage}
                />
              </MotionPressable>
            </Link>
            <Link asChild href="/login">
              <MotionPressable
                accessibilityLabel="Sign in"
                pressScale={motion.scale.subtlePress}
                style={styles.desktopSignIn}
              >
                <CustomerSignInNavGraphic />
              </MotionPressable>
            </Link>
            <CustomerLocaleRegionControl onExpandedChange={setLocalePanelOpen} />
          </View>
        </View>
      </View>
      <DesktopCategoryNav shellContentWidth={shellContentWidth} shellPadding={shellPadding} />
    </View>
  );
}

function DesktopCategoryNav({
  shellContentWidth,
  shellPadding,
}: {
  shellContentWidth: number;
  shellPadding: number;
}) {
  return (
    <View accessibilityLabel="Category navigation" style={styles.desktopCategoryNav}>
      <View
        style={[
          styles.desktopCategoryNavInner,
          { paddingHorizontal: shellPadding, width: shellContentWidth },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.desktopCategoryNavList}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.desktopCategoryNavScroller}
        >
          {webDesktopHeaderNavItems.map((item) => (
            <Link asChild href={item.href as never} key={item.id}>
              <MotionPressable
                pressScale={motion.scale.subtlePress}
                style={StyleSheet.flatten([
                  styles.desktopCategoryNavItem,
                  "menuTypography" in item && item.menuTypography === "lead"
                    ? styles.desktopCategoryNavItemLead
                    : null,
                ])}
              >
                <DesktopCategoryNavIcon name={item.icon} active={Boolean(item.active)} />
                <Text
                  style={[
                    styles.desktopCategoryNavText,
                    "menuTypography" in item && item.menuTypography === "lead"
                      ? styles.desktopCategoryNavTextLead
                      : null,
                  ]}
                >
                  {item.label}
                </Text>
                {"showFire" in item && item.showFire ? (
                  <Image
                    alt=""
                    resizeMode="cover"
                    source={menuFireImage}
                    style={styles.desktopCategoryFire}
                  />
                ) : null}
                {item.active ? <View style={styles.desktopCategoryUnderline} /> : null}
              </MotionPressable>
            </Link>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function DesktopCategoryNavIcon({
  active,
  name,
}: {
  active: boolean;
  name: (typeof webDesktopHeaderNavItems)[number]["icon"];
}) {
  if (name === "none") {
    return null;
  }

  const IconComponent = desktopNavIcons[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      color={active ? "#00B14F" : "#3B3B3B"}
      size={16}
      style={styles.desktopCategoryNavIcon}
      weight="regular"
    />
  );
}

function DesktopGoLinkBanner({ onOpenGuideline, onResultHref }: DesktopGoLinkBannerProps) {
  const [goLinkError, setGoLinkError] = useState("");
  const [goLinkInput, setGoLinkInput] = useState("");

  const handlePasteAndGo = () => {
    const nextGoLinkInput = goLinkInput.trim();

    setGoLinkError("");

    if (!nextGoLinkInput) {
      setGoLinkError(webGoLinkFeature.emptyError);
      return;
    }

    if (!isValidGoLinkUrl(nextGoLinkInput)) {
      setGoLinkError(webGoLinkFeature.invalidUrlError);
      return;
    }

    onResultHref(nextGoLinkInput);
  };

  return (
    <View
      accessibilityLabel="GoGoLink desktop banner"
      style={styles.desktopGoLinkBanner}
      testID="desktop-golink-banner"
    >
      <View style={[styles.desktopGoLinkBackdrop, { pointerEvents: "none" }]} />
      <View style={[styles.desktopGoLinkAccentGlow, { pointerEvents: "none" }]} />
      <MotionPressable
        accessibilityLabel="About GoLink"
        accessibilityRole="button"
        onPress={onOpenGuideline}
        pressScale={motion.scale.subtlePress}
        style={styles.desktopGoLinkInfoButton}
      >
        <InfoIcon color="rgba(10, 92, 74, 0.55)" size={18} strokeWidth={homeIconStrokeWidth} />
      </MotionPressable>
      <View style={styles.desktopGoLinkIllustrationWrap}>
        <Image
          alt="GoGoLink cashback link illustration"
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={golinkBannerIllustrationImage}
          style={styles.desktopGoLinkIllustration}
        />
      </View>
      <View style={styles.desktopGoLinkForm}>
        <Text nativeID="golink-banner-heading" style={styles.desktopGoLinkTitle}>
          {webGoLinkFeature.title}
        </Text>
        <View style={styles.desktopGoLinkControls}>
          <View
            style={[
              styles.desktopGoLinkInputShell,
              goLinkError ? styles.desktopGoLinkInputShellError : null,
            ]}
          >
            <LinkIcon color="rgba(0, 170, 128, 0.48)" size={18} strokeWidth={homeIconStrokeWidth} />
            <TextInput
              accessibilityLabel={webGoLinkFeature.inputLabel}
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="url"
              onChangeText={(nextValue) => {
                setGoLinkInput(nextValue);
                if (goLinkError) {
                  setGoLinkError("");
                }
              }}
              onSubmitEditing={handlePasteAndGo}
              placeholder={webGoLinkFeature.inputPlaceholder}
              placeholderTextColor="rgba(92, 114, 107, 0.55)"
              returnKeyType="go"
              style={[styles.desktopGoLinkInput, webSearchInputFocusReset]}
              value={goLinkInput}
            />
          </View>
          <MotionPressable
            accessibilityRole="button"
            onPress={handlePasteAndGo}
            pressScale={motion.scale.subtlePress}
            style={styles.desktopGoLinkAction}
          >
            <Text style={styles.desktopGoLinkActionText}>{webGoLinkFeature.ctaLabel}</Text>
          </MotionPressable>
        </View>
        {goLinkError ? <Text style={styles.desktopGoLinkError}>{goLinkError}</Text> : null}
      </View>
    </View>
  );
}

function BrowseShortcuts() {
  return (
    <ScrollView
      contentContainerStyle={styles.shortcutRow}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {webBrowseShortcuts.map((shortcut) => (
        <Link asChild href={shortcut.href as never} key={shortcut.id}>
          <MotionPressable pressScale={motion.scale.subtlePress} style={styles.shortcutPill}>
            <ShortcutIcon name={shortcut.icon} />
            <Text style={styles.shortcutText}>{shortcut.label}</Text>
          </MotionPressable>
        </Link>
      ))}
    </ScrollView>
  );
}

function HomeHeroBanners({ homeLayout }: { homeLayout: HomeLayoutMetrics }) {
  const mainBanners = webHomeHeroBanners.filter((banner) => banner.placement === "main");
  const sideBanners = webHomeHeroBanners.filter((banner) => banner.placement === "side");
  const [activeHeroBannerPage, setActiveHeroBannerPage] = useState(0);
  const [heroBannerWidth, setHeroBannerWidth] = useState(homeLayout.contentWidth);
  const heroMaxPageIndex = Math.max(0, mainBanners.length - 1);

  return (
    <View style={[styles.heroStack, homeLayout.isDesktop ? styles.heroStackDesktop : null]}>
      <View
        onLayout={(event) => setHeroBannerWidth(event.nativeEvent.layout.width)}
        style={[
          styles.mainHeroFrame,
          styles.mainHeroFrameAspect,
          homeLayout.isDesktop ? styles.mainHeroFrameDesktop : null,
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.heroScrollContent}
          decelerationRate="fast"
          disableIntervalMomentum
          horizontal
          onMomentumScrollEnd={(event) =>
            setActiveHeroBannerPage(getPagedScrollIndex(event, heroBannerWidth, heroMaxPageIndex))
          }
          onScroll={(event) =>
            setActiveHeroBannerPage(getPagedScrollIndex(event, heroBannerWidth, heroMaxPageIndex))
          }
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={heroBannerWidth}
          style={styles.heroScroll}
        >
          {mainBanners.map((banner) => (
            <HeroBannerLink
              banner={banner}
              key={banner.id}
              style={[styles.heroBannerLink, styles.heroSlide, { width: heroBannerWidth }]}
            >
              <Image
                alt={`${banner.id} promotion banner`}
                accessibilityLabel={`${banner.id} promotion banner`}
                resizeMode="cover"
                source={heroBannerAssets[banner.asset]}
                style={styles.heroImage}
              />
            </HeroBannerLink>
          ))}
        </ScrollView>
        <HeroArrow size="large" />
        <HeroBannerDots activeIndex={activeHeroBannerPage} count={mainBanners.length} />
      </View>

      <View style={[styles.sideHeroRow, homeLayout.isDesktop ? styles.sideHeroRowDesktop : null]}>
        {sideBanners.map((banner) => (
          <HeroBannerLink
            banner={banner}
            key={banner.id}
            style={[
              styles.sideHeroFrame,
              styles.heroBannerLink,
              homeLayout.isDesktop ? styles.sideHeroFrameDesktop : styles.sideHeroFrameMobile,
            ]}
          >
            <Image
              alt={`${banner.id} promotion banner`}
              accessibilityLabel={`${banner.id} promotion banner`}
              resizeMode="cover"
              source={heroBannerAssets[banner.asset]}
              style={styles.heroImage}
            />
            <HeroArrow size="small" />
          </HeroBannerLink>
        ))}
      </View>
    </View>
  );
}

function HeroBannerDots({ activeIndex, count }: { activeIndex: number; count: number }) {
  return (
    <View style={styles.heroDots}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`hero-dot-${index}`}
          style={[styles.heroDot, index === activeIndex ? styles.heroDotActive : null]}
        />
      ))}
    </View>
  );
}

function HeroBannerLink({
  banner,
  children,
  style,
}: {
  banner: HomeHeroBanner;
  children: ReactNode;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <Link asChild href={banner.href as never}>
      <MotionPressable pressScale={motion.scale.subtlePress} style={StyleSheet.flatten(style)}>
        {children}
      </MotionPressable>
    </Link>
  );
}

function HeroArrow({ size }: { size: "large" | "small" }) {
  return (
    <View
      style={[styles.heroArrow, size === "large" ? styles.heroArrowLarge : styles.heroArrowSmall]}
    >
      <ChevronRightIcon
        color={colors.primaryDark}
        size={size === "large" ? 28 : 22}
        strokeWidth={2}
      />
    </View>
  );
}

function TopBrandSection({ homeLayout }: { homeLayout: HomeLayoutMetrics }) {
  const topBrandPages = chunkTopBrandCards(webTopBrandCards, homeLayout.topBrandCardsPerPage);
  const [activeTopBrandPage, setActiveTopBrandPage] = useState(0);
  const topBrandDotCount = getCarouselDotCount(
    webTopBrandCards.length,
    homeLayout.topBrandCardsPerPage
  );
  const topBrandMaxPageIndex = Math.max(0, topBrandPages.length - 1);
  const activeTopBrandDot = Math.min(activeTopBrandPage, topBrandDotCount - 1);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Top Brands</Text>
          <Text style={styles.topBrandEmoji}>🔥</Text>
        </View>
        <Link asChild href="/brand">
          <MotionPressable pressScale={motion.scale.subtlePress}>
            <Text style={styles.sectionAction}>{viewAllLabel}</Text>
          </MotionPressable>
        </Link>
      </View>

      <View style={styles.topBrandPager}>
        <ScrollView
          contentContainerStyle={styles.topBrandPagerContent}
          decelerationRate="fast"
          disableIntervalMomentum
          horizontal
          onScroll={(event) =>
            setActiveTopBrandPage(
              getPagedScrollIndex(event, homeLayout.contentWidth, topBrandMaxPageIndex)
            )
          }
          onMomentumScrollEnd={(event) =>
            setActiveTopBrandPage(
              getPagedScrollIndex(event, homeLayout.contentWidth, topBrandMaxPageIndex)
            )
          }
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={homeLayout.contentWidth}
          style={styles.topBrandScroll}
        >
          {topBrandPages.map((pageCards, pageIndex) => (
            <View
              key={`top-brand-page-${pageIndex}`}
              style={[
                styles.topBrandPage,
                styles.brandGrid,
                {
                  gap: homeLayout.topBrandGap,
                  width: homeLayout.contentWidth,
                },
              ]}
            >
              {pageCards.map((card) => (
                <BrandLogoOfferCard
                  cardHeight={homeLayout.topBrandCardHeight}
                  cardWidth={homeLayout.topBrandCardWidth}
                  key={card.brand}
                  {...card}
                />
              ))}
            </View>
          ))}
        </ScrollView>
        <TopBrandDots activeIndex={activeTopBrandDot} count={topBrandDotCount} />
      </View>
    </View>
  );
}

function TopBrandDots({ activeIndex, count }: { activeIndex: number; count: number }) {
  return (
    <View style={styles.topBrandDots}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`top-brand-dot-${index}`}
          style={[styles.topBrandDot, index === activeIndex ? styles.topBrandDotActive : null]}
        />
      ))}
    </View>
  );
}

function BrandLogoOfferCard({
  brand,
  cardHeight,
  cardWidth,
  cashback,
  label,
  logoUri,
  showGrabCoupon,
  tint,
}: TopBrandCardProps & {
  cardHeight: number;
  cardWidth: number;
}) {
  const large = cardWidth >= 200;
  const logoSource = logoUri ? { uri: logoUri } : shopeeLogo;

  return (
    <Link asChild href={brandHref(brand) as never}>
      <MotionPressable
        style={StyleSheet.flatten([styles.brandCard, { height: cardHeight, width: cardWidth }])}
      >
        <View style={[styles.brandVisual, { backgroundColor: tint }]}>
          {showGrabCoupon ? (
            <View style={styles.couponChip}>
              <Text style={styles.couponIcon}>🧧</Text>
              <Text numberOfLines={1} style={styles.couponText}>
                {label}
              </Text>
            </View>
          ) : null}
          <View style={styles.heartCircle}>
            <HeartIcon color={colors.primaryDark} size={21} strokeWidth={2} />
          </View>
          <Image
            alt={`${brand} logo`}
            accessibilityLabel={`${brand} logo`}
            resizeMode="contain"
            source={logoSource}
            style={styles.brandLogo}
          />
        </View>
        <Text numberOfLines={2} style={[styles.brandName, large ? styles.brandNameLarge : null]}>
          {brand}
        </Text>
        <View style={styles.brandCashbackRow}>
          <Text numberOfLines={1} style={styles.brandCashbackCaption}>
            Cashback up to
          </Text>
          <Text style={[styles.brandCashback, large ? styles.brandCashbackLarge : null]}>
            {cashback}
          </Text>
        </View>
      </MotionPressable>
    </Link>
  );
}

function PromoSection({
  cards,
  dotCount,
  homeLayout,
  icon,
  link,
  title,
}: {
  cards: readonly CompactBrandLogoOfferCardProps[];
  dotCount?: number;
  homeLayout: HomeLayoutMetrics;
  icon?: string;
  link: string;
  title: string;
}) {
  const promoPages = chunkCompactBrandCards(cards, homeLayout.compactBrandCardsPerPage);
  const sectionDotCount = homeLayout.isDesktop
    ? promoPages.length
    : (dotCount ?? promoPages.length);
  const [activePromoPage, setActivePromoPage] = useState(0);
  const promoMaxPageIndex = Math.max(0, promoPages.length - 1);
  const activePromoDot = Math.min(activePromoPage, sectionDotCount - 1);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitleSmall}>{title}</Text>
          {icon ? <Text style={styles.sectionEmoji}>{icon}</Text> : null}
        </View>
        <Link asChild href={link as never}>
          <MotionPressable pressScale={motion.scale.subtlePress}>
            <Text style={styles.sectionAction}>{viewAllLabel}</Text>
          </MotionPressable>
        </Link>
      </View>
      <View style={styles.promoSectionBody}>
        <ScrollView
          contentContainerStyle={styles.promoPagerContent}
          decelerationRate="fast"
          disableIntervalMomentum
          horizontal
          onScroll={(event) =>
            setActivePromoPage(
              getPagedScrollIndex(event, homeLayout.contentWidth, promoMaxPageIndex)
            )
          }
          onMomentumScrollEnd={(event) =>
            setActivePromoPage(
              getPagedScrollIndex(event, homeLayout.contentWidth, promoMaxPageIndex)
            )
          }
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={homeLayout.contentWidth}
          style={[styles.promoScroll, { width: homeLayout.contentWidth }]}
        >
          {promoPages.map((pageCards, pageIndex) => (
            <View
              key={`${title}-promo-page-${pageIndex}`}
              style={[
                styles.promoPage,
                styles.compactBrandGrid,
                {
                  gap: homeLayout.compactBrandGap,
                  width: homeLayout.contentWidth,
                },
              ]}
            >
              {pageCards.map((card) => (
                <CompactBrandLogoOfferCard
                  cardHeight={homeLayout.compactBrandCardHeight}
                  cardWidth={homeLayout.compactBrandCardWidth}
                  logoVisualHeight={homeLayout.compactBrandLogoVisualHeight}
                  key={`${title}-${card.brand}`}
                  {...card}
                />
              ))}
            </View>
          ))}
        </ScrollView>
        {sectionDotCount > 1 ? (
          <PromoSectionDots activeIndex={activePromoDot} count={sectionDotCount} />
        ) : null}
      </View>
    </View>
  );
}

function PromoSectionDots({ activeIndex, count }: { activeIndex: number; count: number }) {
  return (
    <View style={styles.promoSectionDots}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`promo-section-dot-${index}`}
          style={[styles.topBrandDot, index === activeIndex ? styles.topBrandDotActive : null]}
        />
      ))}
    </View>
  );
}

function CompactBrandLogoOfferCard(
  card: CompactBrandLogoOfferCardProps & {
    cardHeight: number;
    cardWidth: number;
    logoVisualHeight: number;
  }
) {
  const logoSource = card.logoUri
    ? { uri: card.logoUri }
    : card.logoAsset
      ? (brandLogoAssets[card.logoAsset] ?? shopeeLogo)
      : shopeeLogo;

  return (
    <Link asChild href={brandHref(card.brand) as never}>
      <MotionPressable
        style={StyleSheet.flatten([
          styles.compactBrandCard,
          { height: card.cardHeight, width: card.cardWidth },
        ])}
      >
        <View
          style={[
            styles.compactBrandVisual,
            { backgroundColor: card.tint, height: card.logoVisualHeight },
          ]}
        >
          {card.logoFallbackText ? (
            <Text numberOfLines={2} style={styles.compactBrandLogoFallback}>
              {card.logoFallbackText}
            </Text>
          ) : (
            <Image
              alt={`${card.brand} logo`}
              accessibilityLabel={`${card.brand} logo`}
              resizeMode="contain"
              source={logoSource}
              style={styles.compactBrandLogo}
            />
          )}
        </View>
        <Text numberOfLines={1} style={styles.compactBrandName}>
          {card.brand}
        </Text>
        <View style={styles.compactCashbackRow}>
          <Text numberOfLines={1} style={styles.compactCashbackCaption}>
            Cashback up to
          </Text>
          <Text style={styles.compactCashbackValue}>{card.cashback}</Text>
        </View>
      </MotionPressable>
    </Link>
  );
}

function CustomerMobileBottomNav({
  bottomInset,
  onGoLinkPress,
}: {
  bottomInset: number;
  onGoLinkPress: () => void;
}) {
  return (
    <View
      style={[
        styles.bottomNavWrap,
        {
          paddingBottom: Math.max(10, bottomInset + 8),
        },
      ]}
    >
      <View style={styles.bottomNav}>
        {webMobileBottomNavItems.map((item) => {
          const active = item.label === "Home";
          const emphasized = "emphasized" in item && item.emphasized;
          const navItemStyle = StyleSheet.flatten([
            styles.bottomNavItem,
            emphasized ? styles.bottomNavItemEmphasized : null,
            active ? styles.bottomNavItemActive : null,
          ]);
          const navItemContent = (
            <>
              <View
                style={[styles.bottomNavIcon, emphasized ? styles.bottomNavIconEmphasized : null]}
              >
                <BottomNavIcon active={active} emphasized={emphasized} name={item.icon} />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.bottomNavLabel,
                  emphasized ? styles.bottomNavLabelEmphasized : null,
                  active ? styles.bottomNavTextActive : null,
                ]}
              >
                {item.label}
              </Text>
            </>
          );

          if (item.href === "/golink") {
            return (
              <MotionPressable
                accessibilityRole="button"
                key={item.label}
                onPress={onGoLinkPress}
                pressScale={motion.scale.subtlePress}
                style={navItemStyle}
              >
                {navItemContent}
              </MotionPressable>
            );
          }

          return (
            <Link asChild href={item.href as never} key={item.label}>
              <MotionPressable pressScale={motion.scale.subtlePress} style={navItemStyle}>
                {navItemContent}
              </MotionPressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

function ShortcutIcon({ name }: { name: string }) {
  const Icon = shortcutIcons[name] ?? ShoppingBagIcon;

  return <Icon color={colors.primaryDark} size={18} strokeWidth={homeIconStrokeWidth} />;
}

function BottomNavIcon({
  active,
  emphasized,
  name,
}: {
  active: boolean;
  emphasized: boolean;
  name: string;
}) {
  const Icon = bottomNavIcons[name] ?? HomeIcon;
  const color = emphasized ? colors.white : active ? colors.primaryDark : colors.muted;

  return <Icon color={color} size={emphasized ? 28 : 24} strokeWidth={homeIconStrokeWidth} />;
}

const styles = StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    position: "relative",
  },
  phoneFrame: {
    backgroundColor: colors.background,
    flex: 1,
    position: "relative",
    width: "100%",
  },
  desktopShell: {
    backgroundColor: colors.white,
    zIndex: 20,
    boxShadow: "0 1px 0 rgba(229, 231, 235, 0.75)",
  },
  desktopHeader: {
    alignItems: "center",
    backgroundColor: colors.white,
    height: mobileShellLayout.desktopHeaderHeight,
    justifyContent: "center",
    width: "100%",
  },
  desktopHeaderOverlayLayer: {
    position: "relative",
    zIndex: 120,
  },
  desktopHeaderContent: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 20,
    height: mobileShellLayout.desktopHeaderHeight,
    justifyContent: "space-between",
  },
  desktopLogoLink: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
  },
  desktopLogoMark: {
    borderRadius: 16,
    height: 56,
    width: 56,
  },
  desktopLogoText: {
    color: "#1F2937",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  desktopHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  desktopQuestPill: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 169,
  },
  desktopQuestImage: {
    height: 48,
    width: 169,
  },
  desktopSignIn: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 160,
  },
  desktopLocaleButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#E5E7EB",
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
  },
  desktopLocaleButtonOpen: {
    backgroundColor: "#E8FAF5",
    borderColor: "rgba(0, 204, 153, 0.4)",
  },
  desktopLocaleRoot: {
    position: "relative",
    zIndex: 90,
  },
  desktopLocalePopover: {
    backgroundColor: colors.white,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
    padding: 16,
    position: "absolute",
    right: 0,
    top: 52,
    width: 288,
    zIndex: 100,
  },
  desktopLocaleSectionTitle: {
    color: "#9CA3AF",
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  desktopLocaleOptionStack: {
    gap: 2,
    marginTop: 8,
  },
  desktopLocaleOption: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  desktopLocaleOptionSelected: {
    backgroundColor: "#E8FAF5",
  },
  desktopLocaleOptionFlag: {
    fontSize: 18,
    lineHeight: 20,
  },
  desktopLocaleOptionLabel: {
    color: "#374151",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  desktopLocaleOptionLabelSelected: {
    color: "#00CC99",
  },
  desktopLocaleDivider: {
    backgroundColor: "#F3F4F6",
    height: 1,
    marginBottom: 16,
    marginTop: 16,
  },
  desktopLocaleRegionScroller: {
    height: 192,
    marginTop: 8,
    overflow: "hidden",
  },
  desktopLocaleRegionList: {
    gap: 2,
    paddingRight: 4,
  },
  desktopCategoryNav: {
    alignItems: "center",
    backgroundColor: colors.white,
    height: mobileShellLayout.desktopSubNavHeight,
    justifyContent: "center",
    width: "100%",
  },
  desktopCategoryNavInner: {
    alignItems: "center",
    alignSelf: "center",
    height: mobileShellLayout.desktopSubNavHeight,
    justifyContent: "center",
  },
  desktopCategoryNavScroller: {
    flexGrow: 0,
    height: 38,
  },
  desktopCategoryNavList: {
    alignItems: "flex-end",
    gap: 16,
    justifyContent: "center",
    minHeight: 38,
    transform: [{ translateX: -1.6 }],
  },
  desktopCategoryNavItem: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: 8,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: "relative",
  },
  desktopCategoryNavItemLead: {
    height: 40,
  },
  desktopCategoryNavIcon: {
    height: 16,
    width: 16,
  },
  desktopCategoryNavText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
  },
  desktopCategoryNavTextLead: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  desktopCategoryFire: {
    height: 16,
    width: 13,
  },
  desktopCategoryUnderline: {
    backgroundColor: "#00B14F",
    borderRadius: radii.chip,
    bottom: 0,
    height: 2,
    left: 16,
    position: "absolute",
    right: 16,
  },
  stickySearch: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    boxShadow: shadows.cardCss,
  },
  searchPillActive: {
    borderColor: colors.primaryDark,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    height: 42,
    minWidth: 0,
    padding: 0,
  },
  searchText: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
  },
  searchPopoverLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },
  searchPopoverBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  searchPopoverPosition: {
    position: "absolute",
  },
  searchPopover: {
    backgroundColor: "#FAFDFB",
    borderColor: "rgba(0, 170, 128, 0.1)",
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: 640,
    overflow: "hidden",
    padding: 20,
    boxShadow: "0 16px 40px rgba(16, 53, 34, 0.12)",
  },
  searchPopoverScroll: {
    maxHeight: 600,
  },
  searchPopoverContent: {
    gap: spacing.md,
  },
  searchPopoverIntro: {
    alignItems: "center",
    backgroundColor: "#F6FEF9",
    borderColor: "rgba(209, 250, 229, 0.9)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchPopoverIntroCompact: {
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchTrendingIcon: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.md,
    height: 64,
    justifyContent: "center",
    width: 64,
    boxShadow: shadows.cardCss,
  },
  searchTrendingIconCompact: {
    height: 52,
    width: 52,
  },
  searchIntroCopy: {
    flex: 1,
    minWidth: 0,
  },
  searchPopoverTitle: {
    color: "#103522",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  searchPopoverTitleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  searchPopoverSubtitle: {
    color: "#5C7A9A",
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: typography.bodyWeight,
    lineHeight: 26,
    marginTop: 6,
  },
  searchPopoverSubtitleCompact: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  searchTypedContent: {
    gap: 12,
  },
  searchNoMatchCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    color: "#64748B",
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    lineHeight: 26,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchResultsHeading: {
    gap: 2,
  },
  searchResultsTitle: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 17,
    textTransform: "uppercase",
  },
  searchResultsSubtitle: {
    color: "#64748B",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    lineHeight: 19,
  },
  searchDivider: {
    backgroundColor: "rgba(0, 170, 128, 0.12)",
    height: 1,
  },
  searchResultList: {
    gap: 8,
  },
  searchResultListCompact: {
    gap: 8,
  },
  searchResultRow: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "#E8F0EC",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: mobileShellLayout.searchPopoverResultRowGap,
    minHeight: 84,
    padding: spacing.sm,
    boxShadow: shadows.cardCss,
  },
  searchResultRowCompact: {
    borderColor: "transparent",
    borderRadius: radii.sm,
    minHeight: 56,
    padding: 8,
    boxShadow: "none",
  },
  searchResultLogo: {
    alignItems: "center",
    borderRadius: 14,
    height: 68,
    justifyContent: "center",
    overflow: "hidden",
    width: 68,
  },
  searchResultLogoCompact: {
    borderRadius: 8,
    height: 40,
    width: 40,
  },
  searchResultLogoText: {
    fontFamily: typography.family,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 36,
  },
  searchResultLogoTextCompact: {
    fontSize: 20,
    lineHeight: 24,
  },
  searchResultCopy: {
    flex: 1,
    minWidth: 0,
  },
  searchResultName: {
    color: "#1E3A5F",
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  searchResultNameCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  searchResultCashbackRow: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 4,
  },
  searchResultCaption: {
    color: "#7195B8",
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: typography.bodyWeight,
  },
  searchResultCaptionCompact: {
    fontSize: 11,
  },
  searchResultCashback: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "700",
  },
  searchResultCashbackCompact: {
    fontSize: 14,
  },
  searchResultAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    height: 44,
    justifyContent: "center",
    minWidth: mobileShellLayout.searchPopoverActionMinWidth,
    paddingHorizontal: spacing.sm,
  },
  searchResultActionCompact: {
    height: 28,
    minWidth: 86,
    paddingHorizontal: 12,
  },
  searchResultActionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
  },
  searchResultActionTextCompact: {
    fontSize: 11,
  },
  page: {
    gap: spacing.homeStackGap,
    paddingTop: mobileShellLayout.contentTopGap,
  },
  pageDesktop: {
    gap: mobileShellLayout.desktopHomeStackGap,
  },
  shortcutRow: {
    gap: 8,
    paddingRight: spacing.md,
  },
  shortcutPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: mobileShellLayout.shortcutPillHeight,
    paddingHorizontal: 12,
    boxShadow: shadows.cardCss,
  },
  shortcutText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: typography.labelWeight,
  },
  heroStack: {
    gap: spacing.sm,
  },
  heroStackDesktop: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.md,
  },
  mainHeroFrame: {
    borderRadius: radii.lg,
    overflow: "hidden",
    position: "relative",
    boxShadow: shadows.cardCss,
  },
  heroBannerLink: {
    backgroundColor: "#E8EAED",
  },
  heroScroll: {
    height: "100%",
    width: "100%",
  },
  heroScrollContent: {
    alignItems: "stretch",
  },
  heroSlide: {
    height: "100%",
    flexShrink: 0,
  },
  mainHeroFrameAspect: {
    aspectRatio: mobileShellLayout.homeBannerAspectRatio,
  },
  mainHeroFrameDesktop: {
    flex: 1.72,
  },
  sideHeroRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sideHeroRowDesktop: {
    flex: 1,
    flexDirection: "column",
    gap: spacing.md,
  },
  sideHeroFrame: {
    borderRadius: radii.md,
    flex: 1,
    overflow: "hidden",
    position: "relative",
    boxShadow: shadows.cardCss,
  },
  sideHeroFrameMobile: {
    aspectRatio: mobileShellLayout.homeSideBannerAspectRatio,
    minHeight: 158,
  },
  sideHeroFrameDesktop: {
    minHeight: 0,
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  heroArrow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: radii.chip,
    justifyContent: "center",
    position: "absolute",
  },
  heroArrowLarge: {
    bottom: spacing.md,
    height: 48,
    right: spacing.md,
    width: 48,
  },
  heroArrowSmall: {
    bottom: spacing.sm,
    height: 36,
    right: spacing.sm,
    width: 36,
  },
  heroDots: {
    alignItems: "center",
    bottom: spacing.md,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  heroDot: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: radii.chip,
    height: 8,
    width: 8,
  },
  heroDotActive: {
    backgroundColor: colors.white,
  },
  desktopGoLinkBanner: {
    alignItems: "center",
    borderRadius: 32,
    flexDirection: "row",
    gap: 48,
    minHeight: 265,
    overflow: "hidden",
    paddingHorizontal: 32,
    paddingVertical: 36,
    position: "relative",
    width: "100%",
    boxShadow: "0 4px 10px rgba(4, 16, 34, 0.06), 0 25px 75px rgba(7, 33, 102, 0.12)",
  },
  desktopGoLinkBackdrop: {
    backgroundColor: "#EAF4FF",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  desktopGoLinkAccentGlow: {
    backgroundColor: "rgba(0, 204, 153, 0.22)",
    borderRadius: 360,
    bottom: -220,
    height: 420,
    position: "absolute",
    right: -40,
    width: 520,
  },
  desktopGoLinkInfoButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    top: 20,
    width: 24,
    zIndex: 3,
  },
  desktopGoLinkIllustrationWrap: {
    flexShrink: 0,
    height: 190,
    maxWidth: 420,
    width: "32%",
    zIndex: 1,
  },
  desktopGoLinkIllustration: {
    height: "100%",
    width: "100%",
  },
  desktopGoLinkForm: {
    flex: 1,
    gap: 22,
    minWidth: 0,
    paddingRight: 28,
    zIndex: 1,
  },
  desktopGoLinkTitle: {
    color: "#0A5C4A",
    fontFamily: typography.family,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 38,
  },
  desktopGoLinkControls: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 12,
  },
  desktopGoLinkInputShell: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "rgba(0, 170, 128, 0.35)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    height: 48,
    minWidth: 0,
    paddingLeft: 16,
    paddingRight: 14,
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.9)",
  },
  desktopGoLinkInputShellError: {
    borderColor: "#EF4444",
  },
  desktopGoLinkInput: {
    color: "#2D3F3A",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    height: 46,
    minWidth: 0,
    padding: 0,
  },
  desktopGoLinkAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    height: 48,
    justifyContent: "center",
    minWidth: 182,
    paddingHorizontal: 40,
    boxShadow: "0 8px 28px -6px rgba(0, 204, 153, 0.55)",
  },
  desktopGoLinkActionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
  },
  desktopGoLinkError: {
    color: "#B91C1C",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: -14,
  },
  section: {
    gap: mobileShellLayout.homePromoSectionGap,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: mobileShellLayout.homeSectionHeaderHeight,
  },
  titleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  sectionTitle: {
    color: "#103522",
    fontFamily: typography.family,
    fontSize: typography.sectionTitle,
    fontWeight: typography.sectionTitleWeight,
    lineHeight: 34,
  },
  sectionTitleSmall: {
    color: "#103522",
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: typography.sectionTitle,
    fontWeight: typography.sectionTitleWeight,
    lineHeight: 34,
  },
  sectionEmoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  topBrandEmoji: {
    fontSize: 30,
    lineHeight: 34,
  },
  sectionAction: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
  },
  topBrandPager: {
    gap: 14,
    overflow: "hidden",
  },
  topBrandScroll: {
    width: "100%",
  },
  topBrandPagerContent: {
    alignItems: "flex-start",
  },
  topBrandPage: {
    flexShrink: 0,
  },
  topBrandDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  topBrandDot: {
    backgroundColor: "#BFCFC8",
    borderRadius: radii.chip,
    height: 12,
    width: 12,
  },
  topBrandDotActive: {
    backgroundColor: colors.primary,
  },
  brandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileShellLayout.topBrandGridGap,
  },
  brandCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
    padding: 8,
    boxShadow: shadows.cardCss,
  },
  brandVisual: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: radii.sm,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  couponChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: 4,
    height: 20,
    left: 6,
    maxWidth: "70%",
    paddingHorizontal: 6,
    position: "absolute",
    top: 6,
    zIndex: 2,
  },
  couponIcon: {
    fontSize: 12,
    lineHeight: 14,
  },
  couponText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 10,
    fontWeight: typography.bodyWeight,
  },
  heartCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radii.chip,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 34,
    zIndex: 2,
  },
  brandLogo: {
    height: "62%",
    width: "72%",
  },
  brandName: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.labelWeight,
    lineHeight: 17.5,
    marginTop: spacing.sm,
    minHeight: 35,
  },
  brandNameLarge: {
    fontSize: 14,
  },
  brandCashbackRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: "auto",
  },
  brandCashbackCaption: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: typography.bodyWeight,
  },
  brandCashback: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },
  brandCashbackLarge: {
    fontSize: 20,
  },
  compactBrandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileShellLayout.compactBrandGridGap,
  },
  promoSectionBody: {
    gap: 14,
    overflow: "hidden",
  },
  promoScroll: {
    width: "100%",
  },
  promoPagerContent: {
    alignItems: "flex-start",
  },
  promoPage: {
    flexShrink: 0,
  },
  promoSectionDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  compactBrandCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
    height: mobileShellLayout.compactBrandLogoCardHeight,
    overflow: "hidden",
    padding: 8,
    boxShadow: shadows.cardCss,
  },
  compactBrandVisual: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: mobileShellLayout.compactBrandLogoVisualHeight,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
  compactBrandLogo: {
    height: "62%",
    width: "72%",
  },
  compactBrandLogoFallback: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
    width: "72%",
  },
  compactBrandName: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: typography.labelWeight,
    lineHeight: 15,
  },
  compactCashbackRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  compactCashbackCaption: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 10,
    fontWeight: typography.bodyWeight,
    lineHeight: 10,
  },
  compactCashbackValue: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 16,
  },
  bottomNavWrap: {
    bottom: 0,
    left: 0,
    marginHorizontal: "auto",
    maxWidth: mobileShellLayout.bottomNavMaxWidth,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
  },
  bottomNav: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: "rgba(216,226,217,0.7)",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 86,
    paddingHorizontal: spacing.sm,
    boxShadow: shadows.bottomNavCss,
  },
  bottomNavItem: {
    alignItems: "center",
    borderRadius: radii.lg,
    flex: 1,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 62,
  },
  bottomNavItemActive: {
    backgroundColor: colors.primarySoft,
  },
  bottomNavItemEmphasized: {
    marginTop: -22,
  },
  bottomNavIcon: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    minWidth: 28,
  },
  bottomNavIconEmphasized: {
    backgroundColor: colors.primary,
    borderColor: colors.primarySoft,
    borderRadius: radii.chip,
    borderWidth: 8,
    height: 72,
    width: 72,
  },
  bottomNavLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: typography.navLabelWeight,
    maxWidth: 74,
  },
  bottomNavLabelEmphasized: {
    color: colors.accent,
  },
  bottomNavTextActive: {
    color: colors.primaryDark,
  },
});
