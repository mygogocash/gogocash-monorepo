import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ChevronUp as ChevronUpIcon,
  Search as SearchIcon,
} from "@mobile/theme/icons";
import { Animated, RefreshControl, ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReducedMotion } from "@mobile/hooks/useReducedMotion";

import {
  CustomerGoLinkScreen,
  GoLinkGuidelineDialog,
  GoLinkResultDialog,
} from "@mobile/screens/CustomerGoLinkScreen";
import { CustomerDesktopHeader } from "@mobile/components/CustomerDesktopHeader";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerCookieConsentBanner } from "@mobile/components/CustomerCookieConsentBanner";
import { IntroAfterLoginModal } from "@mobile/components/IntroAfterLoginModal";
import { CustomerLineOfficialFab } from "@mobile/components/CustomerLineOfficialFab";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { buildLoginRedirectWithCallback } from "@mobile/auth/routeGuard";
import { getMobileEnv } from "@mobile/config/env";
import {
  openGoLinkTracked,
  useGoLinkResolution,
} from "@mobile/features/useGoLinkResolution";
import {
  resolveApiLandingRails,
  resolveLiveBrandCards,
} from "@mobile/account/brandCatalogResource";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { usePublicCatalogPullToRefresh } from "@mobile/account/usePublicCatalogPullToRefresh";
import {
  getDesktopShellOffset,
  getResponsiveHomeLayoutMetrics,
  mobileShellLayout,
  webHomePromoSections,
  webHomeSearchPlaceholder,
  webHomeSectionOrder,
} from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { normalizeSearchQuery } from "@mobile/search/searchHistoryCore";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { motion } from "@mobile/theme/motion";

import { createHomeScreenStyles } from "./home/customerHomeStyles";
import { CustomerMobileBottomNav } from "./home/CustomerMobileBottomNav";
import { resolveGoLinkMode } from "@mobile/config/featureFlags";
import { DesktopGoLinkBanner } from "./home/DesktopGoLinkBanner";
import { homeGoLinkShopNowRoute, homeIconStrokeWidth, webSearchInputFocusReset } from "./home/homeAssets";
import { HomeHeroBanners } from "./home/HomeHeroBanners";
import { HomeSearchPopularPopover } from "./home/HomeSearchPopularPopover";
import type { SearchAnchorFrame } from "./home/searchPopoverFrame";
import { HomeScreenThemeProvider } from "./home/homeScreenHooks";
import { BrowseShortcuts } from "./home/BrowseShortcuts";
import { MobileTabletHomeHeader } from "./home/MobileTabletHomeHeader";
import { PromoSection } from "./home/PromoSection";
import { TopBrandSection } from "./home/TopBrandSection";
import { BrandCategorySection } from "./home/BrandCategorySection";
import { resolveBrandCategoryTiles } from "./home/brandCategoryTiles";

export function CustomerHomeScreen() {
  const { colors, resolved } = useTheme();
  const surfaces = getThemeSurfaces(colors, resolved);
  const styles = useThemedStyles((palette) => createHomeScreenStyles(palette, surfaces));
  const homeTheme = useMemo(
    () => ({ styles, colors, surfaces }),
    [styles, colors, surfaces]
  );
  const session = useMobileSessionSnapshot();
  const mobileTabletGreetingName =
    typeof session?.username === "string" ? session.username.trim() || undefined : undefined;
  const [mobileTabletGoLinkCovered, setMobileTabletGoLinkCovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const goLinkToggleProgress = useRef(new Animated.Value(0)).current;
  const tc = useCopy();
  const { region } = useLocale();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);
  const [desktopGoLinkGuidelineOpen, setDesktopGoLinkGuidelineOpen] = useState(false);
  const [desktopGoLinkResultHref, setDesktopGoLinkResultHref] = useState("");
  // The home hero card renders the same result dialog as the /golink screen —
  // it MUST carry the live resolution wiring too (regression: unwired, it fell
  // back to the fixtures demo product in backend mode).
  const { isAuthed } = useAuthGuardSession();
  const {
    live: liveGoLink,
    match: goLinkMatch,
    productPreview: goLinkProductPreview,
  } = useGoLinkResolution(Boolean(desktopGoLinkResultHref), desktopGoLinkResultHref);
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
  const [searchPopoverMounted, setSearchPopoverMounted] = useState(false);
  const [searchAnchorFrame, setSearchAnchorFrame] = useState<SearchAnchorFrame | null>(null);
  const [goLinkSheetOpen, setGoLinkSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // GoLink 3-state: "hidden" removes the surface, "comingSoon" shows it disabled.
  const goLinkMode = resolveGoLinkMode();
  const brandCatalogResource = useCustomerAccountResource({
    fixtureData: webHomePromoSections,
    resourceId: "brandCatalog",
  });
  // Admin-curated homepage rails (GET /offer/landing-rails). Prefer these; the
  // fixture is the fallback when the API is unavailable / not in backend mode.
  const landingRailsResource = useCustomerAccountResource({
    fixtureData: { data: [] },
    resourceId: "landingRails",
  });
  const { onRefresh: onPullToRefresh, refreshing } = usePublicCatalogPullToRefresh();
  const homeRefreshControl = (
    <RefreshControl
      onRefresh={onPullToRefresh}
      refreshing={refreshing}
      tintColor={colors.primaryDark}
    />
  );
  const promoSections = resolveApiLandingRails(
    landingRailsResource.source,
    landingRailsResource.data,
    webHomePromoSections,
    region,
  );
  const liveCards = useMemo(
    () => resolveLiveBrandCards(brandCatalogResource.source, brandCatalogResource.data, [], region),
    [brandCatalogResource.source, brandCatalogResource.data, region],
  );
  const brandCategoryTiles = useMemo(() => resolveBrandCategoryTiles(liveCards), [liveCards]);
  const searchTopPadding = Math.max(8, insets.top + 8);
  const searchPopoverTop = searchTopPadding + 62;
  const openMobileSearch = useCallback(() => {
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    router.push(
      normalizedQuery
        ? ({ pathname: "/search", params: { q: normalizedQuery } } as never)
        : ("/search" as never)
    );
  }, [router, searchQuery]);
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
    const pastedUrl = desktopGoLinkResultHref;
    const offer = goLinkMatch.offer;
    setDesktopGoLinkResultHref("");
    if (!liveGoLink) {
      router.push(homeGoLinkShopNowRoute as never);
      return;
    }
    if (!offer) {
      return;
    }
    if (!isAuthed) {
      router.push(buildLoginRedirectWithCallback("/") as never);
      return;
    }
    void openGoLinkTracked(offer, pastedUrl, {
      accessToken:
        typeof session?.access_token === "string" ? session.access_token : undefined,
      apiUrl: getMobileEnv().apiUrl,
    });
  }, [desktopGoLinkResultHref, goLinkMatch.offer, isAuthed, liveGoLink, router, session]);

  useEffect(() => {
    goLinkToggleProgress.stopAnimation();
    Animated.timing(goLinkToggleProgress, {
      duration: reducedMotion ? 0 : motion.duration.accordionChevron,
      easing: motion.easing.standard,
      toValue: mobileTabletGoLinkCovered ? 1 : 0,
      useNativeDriver: motion.useNativeDriver,
    }).start();
  }, [goLinkToggleProgress, mobileTabletGoLinkCovered, reducedMotion]);

  const goLinkToggleChevronRotate = goLinkToggleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const homeSections = (
    <>
      {webHomeSectionOrder.includes("banner") ? (
        <HomeHeroBanners homeLayout={homeLayout} />
      ) : null}
      {homeLayout.isDesktop && goLinkMode !== "hidden" ? (
        <DesktopGoLinkBanner
          comingSoon={goLinkMode === "comingSoon"}
          onOpenGuideline={() => setDesktopGoLinkGuidelineOpen(true)}
          onResultHref={setDesktopGoLinkResultHref}
        />
      ) : null}
      {/* #497 — the explore bar belongs between the banners and Top Brands on
          mobile/tablet. Desktop reaches the same destinations from the header nav
          (CustomerDesktopHeader), so rendering it here too would duplicate them. */}
      {!homeLayout.isDesktop ? (
        <View style={styles.mobileTabletExploreBar}>
          <BrowseShortcuts />
        </View>
      ) : null}
      {webHomeSectionOrder.includes("extra") ? (
        <TopBrandSection brandCatalogData={brandCatalogResource.data} homeLayout={homeLayout} />
      ) : null}
      <BrandCategorySection
        contentWidth={homeLayout.contentWidth}
        isDesktop={homeLayout.isDesktop}
        tiles={brandCategoryTiles}
      />
      {promoSections.filter((section) => section.cards.length > 0).map((section) => (
        <PromoSection homeLayout={homeLayout} key={section.id} {...section} />
      ))}
    </>
  );

  // DESKTOP: full-bleed chrome. The header and footer span the full viewport
  // width; only the content sections are capped at contentMaxWidth and centered.
  if (homeLayout.isDesktop) {
    return (
      <HomeScreenThemeProvider value={homeTheme}>
        <View style={styles.viewport}>
          <View style={styles.desktopShellFrame}>
            <CustomerDesktopHeader
              onSearchFocus={openSearchPopover}
              onSearchFrameChange={setSearchAnchorFrame}
              onSearchQueryChange={setSearchQuery}
              searchQuery={searchQuery}
              viewportWidth={width}
            />
            <ScrollView
              contentContainerStyle={[
                styles.desktopScrollContent,
                styles.pageDesktopFullBleed,
                {
                  paddingBottom: homeLayout.pageBottomPadding,
                  paddingTop: mobileShellLayout.desktopHomeTopGap,
                },
              ]}
              refreshControl={homeRefreshControl}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.desktopContentCap,
                  {
                    maxWidth: homeLayout.contentMaxWidth,
                    paddingHorizontal: homeLayout.contentHorizontalPadding,
                  },
                ]}
              >
                {homeSections}
              </View>
              <View
                style={[styles.desktopFooterCap, { maxWidth: homeLayout.contentMaxWidth }]}
              >
                <CustomerDesktopFooter
                  horizontalPadding={desktopFooterHorizontalOffset}
                  viewportWidth={width}
                />
              </View>
            </ScrollView>
          </View>
          {searchPopoverMounted ? (
            <HomeSearchPopularPopover
              anchor={searchAnchorFrame}
              horizontalPadding={homeLayout.contentHorizontalPadding}
              liveCards={liveCards}
              onClose={closeSearchPopover}
              onExited={handleSearchPopoverExited}
              onSelectRecent={(term) => setSearchQuery(term)}
              query={searchQuery}
              top={searchPopoverTop}
              viewportWidth={width}
              visible={searchPopoverOpen}
            />
          ) : null}
          {goLinkSheetOpen ? (
            <CustomerGoLinkScreen
              onClose={() => setGoLinkSheetOpen(false)}
              presentation="homeSheet"
            />
          ) : null}
          {desktopGoLinkGuidelineOpen ? (
            <GoLinkGuidelineDialog onClose={() => setDesktopGoLinkGuidelineOpen(false)} />
          ) : null}
          {desktopGoLinkResultHref ? (
            <GoLinkResultDialog
              href={desktopGoLinkResultHref}
              live={liveGoLink}
              match={goLinkMatch}
              onClose={() => setDesktopGoLinkResultHref("")}
              onShopNow={handleDesktopGoLinkShopNow}
              productPreview={goLinkProductPreview}
            />
          ) : null}
          <IntroAfterLoginModal />
          <CustomerCookieConsentBanner isDesktop />
          <CustomerLineOfficialFab />
        </View>
      </HomeScreenThemeProvider>
    );
  }

  // MOBILE: unchanged — capped phoneFrame with sticky search and bottom nav.
  return (
    <HomeScreenThemeProvider value={homeTheme}>
      <View style={styles.viewport}>
        <View style={[styles.phoneFrame, { maxWidth: homeLayout.contentMaxWidth }]}>
          <ScrollView
            style={styles.mobileTabletPageScroll}
            contentContainerStyle={styles.mobileTabletPageScrollContent}
            refreshControl={homeRefreshControl}
            showsVerticalScrollIndicator={false}
          >
            <MobileTabletHomeHeader
              greetingName={mobileTabletGreetingName}
              homeLayout={homeLayout}
              isGoLinkCovered={mobileTabletGoLinkCovered}
              onGoLinkResultHref={setDesktopGoLinkResultHref}
              onOpenGoLinkGuideline={() => setDesktopGoLinkGuidelineOpen(true)}
              onOpenSearchPopover={openMobileSearch}
            />
            <View
              style={[
                styles.stickySearch,
                styles.mobileTabletLegacySearchHidden,
                {
                  paddingHorizontal:
                    homeLayout.contentWidth === 768 ? homeLayout.contentHorizontalPadding : 16,
                  paddingTop: searchTopPadding,
                },
              ]}
            >
              <MotionPressable
                onPress={openMobileSearch}
                pressScale={motion.scale.subtlePress}
                style={styles.searchPill}
              >
                <SearchIcon color={colors.primaryDark} size={20} strokeWidth={homeIconStrokeWidth} />
                <TextInput
                  accessibilityLabel={tc("Search brands, stores, products, and cashback offers")}
                  nativeID="home-search-input-hidden"
                  onBlur={() => undefined}
                  onChangeText={setSearchQuery}
                  onFocus={openMobileSearch}
                  onPressIn={openMobileSearch}
                  placeholder={tc(webHomeSearchPlaceholder)}
                  placeholderTextColor={colors.muted}
                  style={[styles.searchInput, webSearchInputFocusReset]}
                  testID="home-search-input-hidden"
                  value={searchQuery}
                />
              </MotionPressable>
            </View>

            <View
              style={[
                styles.page,
                styles.mobileTabletContentScroll,
                styles.mobileTabletContentSheet,
                {
                  paddingBottom: homeLayout.pageBottomPadding,
                  paddingHorizontal: 24,
                  paddingTop: 24,
                },
              ]}
            >
              <MotionPressable
                accessibilityLabel={tc(
                  mobileTabletGoLinkCovered ? "Show GoLink banner" : "Cover GoLink banner"
                )}
                accessibilityRole="button"
                onPress={() => setMobileTabletGoLinkCovered((covered) => !covered)}
                pressScale={motion.scale.subtlePress}
                style={styles.mobileTabletSheetToggleButton}
              >
                <Animated.View style={{ transform: [{ rotate: goLinkToggleChevronRotate }] }}>
                  <ChevronUpIcon color={colors.ink} size={18} strokeWidth={homeIconStrokeWidth} />
                </Animated.View>
              </MotionPressable>
              {homeSections}
            </View>
          </ScrollView>

          {homeLayout.showBottomNav ? (
            <CustomerMobileBottomNav
              bottomInset={insets.bottom}
              onGoLinkPress={() => setGoLinkSheetOpen(true)}
            />
          ) : null}
          {goLinkSheetOpen ? (
            <CustomerGoLinkScreen
              onClose={() => setGoLinkSheetOpen(false)}
              presentation="homeSheet"
            />
          ) : null}
          {/* The mobile header's GoLink banner shares the desktop handlers —
              the dialogs must be mounted in THIS branch too, or the (i) and
              link-submit taps set state that nothing renders. */}
          {desktopGoLinkGuidelineOpen ? (
            <GoLinkGuidelineDialog onClose={() => setDesktopGoLinkGuidelineOpen(false)} />
          ) : null}
          {desktopGoLinkResultHref ? (
            <GoLinkResultDialog
              href={desktopGoLinkResultHref}
              live={liveGoLink}
              match={goLinkMatch}
              onClose={() => setDesktopGoLinkResultHref("")}
              onShopNow={handleDesktopGoLinkShopNow}
              productPreview={goLinkProductPreview}
            />
          ) : null}
        </View>
        <IntroAfterLoginModal />
        <CustomerCookieConsentBanner isDesktop={false} />
      </View>
    </HomeScreenThemeProvider>
  );
}
