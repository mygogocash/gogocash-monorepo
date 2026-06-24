import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Search as SearchIcon,
} from "@mobile/theme/icons";
import { ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { resolveHomePromoSections } from "@mobile/account/brandCatalogResource";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import {
  getDesktopShellOffset,
  getResponsiveHomeLayoutMetrics,
  mobileShellLayout,
  webHomePromoSections,
  webHomeSearchPlaceholder,
  webHomeSectionOrder,
} from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { motion } from "@mobile/theme/motion";

import { createHomeScreenStyles } from "./home/customerHomeStyles";
import { CustomerMobileBottomNav } from "./home/CustomerMobileBottomNav";
import { DesktopGoLinkBanner } from "./home/DesktopGoLinkBanner";
import { homeGoLinkShopNowRoute, homeIconStrokeWidth, webSearchInputFocusReset } from "./home/homeAssets";
import { HomeHeroBanners } from "./home/HomeHeroBanners";
import { HomeSearchPopularPopover } from "./home/HomeSearchPopularPopover";
import { HomeScreenThemeProvider } from "./home/homeScreenHooks";
import { MobileTabletHomeHeader } from "./home/MobileTabletHomeHeader";
import { PromoSection } from "./home/PromoSection";
import { TopBrandSection } from "./home/TopBrandSection";

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
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);
  const [desktopGoLinkGuidelineOpen, setDesktopGoLinkGuidelineOpen] = useState(false);
  const [desktopGoLinkResultHref, setDesktopGoLinkResultHref] = useState("");
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
  const [searchPopoverMounted, setSearchPopoverMounted] = useState(false);
  const [goLinkSheetOpen, setGoLinkSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const brandCatalogResource = useCustomerAccountResource({
    fixtureData: webHomePromoSections,
    resourceId: "brandCatalog",
  });
  const promoSections = resolveHomePromoSections(
    brandCatalogResource.source,
    brandCatalogResource.data,
    webHomePromoSections
  );
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

  const homeSections = (
    <>
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
        <TopBrandSection brandCatalogData={brandCatalogResource.data} homeLayout={homeLayout} />
      ) : null}
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
            <CustomerDesktopHeader viewportWidth={width} />
            <ScrollView
              contentContainerStyle={[
                styles.desktopScrollContent,
                styles.pageDesktopFullBleed,
                {
                  paddingBottom: homeLayout.pageBottomPadding,
                  paddingTop: mobileShellLayout.desktopHomeTopGap,
                },
              ]}
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
          {desktopGoLinkGuidelineOpen ? (
            <GoLinkGuidelineDialog onClose={() => setDesktopGoLinkGuidelineOpen(false)} />
          ) : null}
          {desktopGoLinkResultHref ? (
            <GoLinkResultDialog
              href={desktopGoLinkResultHref}
              onClose={() => setDesktopGoLinkResultHref("")}
              onShopNow={handleDesktopGoLinkShopNow}
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
            showsVerticalScrollIndicator={false}
          >
            <MobileTabletHomeHeader
              greetingName={mobileTabletGreetingName}
              homeLayout={homeLayout}
              isGoLinkCovered={mobileTabletGoLinkCovered}
              onGoLinkResultHref={setDesktopGoLinkResultHref}
              onOpenGoLinkGuideline={() => setDesktopGoLinkGuidelineOpen(true)}
              onOpenSearchPopover={openSearchPopover}
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
                onPress={openSearchPopover}
                pressScale={motion.scale.subtlePress}
                style={[styles.searchPill, searchPopoverOpen ? styles.searchPillActive : null]}
              >
                <SearchIcon color={colors.primaryDark} size={20} strokeWidth={homeIconStrokeWidth} />
                <TextInput
                  accessibilityLabel={tc("Search brands, stores, products, and cashback offers")}
                  nativeID="home-search-input-hidden"
                  onBlur={() => undefined}
                  onChangeText={setSearchQuery}
                  onFocus={openSearchPopover}
                  onPressIn={openSearchPopover}
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
                {mobileTabletGoLinkCovered ? (
                  <ChevronDownIcon color="#111827" size={18} strokeWidth={homeIconStrokeWidth} />
                ) : (
                  <ChevronUpIcon color="#111827" size={18} strokeWidth={homeIconStrokeWidth} />
                )}
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
        </View>
        <IntroAfterLoginModal />
        <CustomerCookieConsentBanner isDesktop={false} />
      </View>
    </HomeScreenThemeProvider>
  );
}
