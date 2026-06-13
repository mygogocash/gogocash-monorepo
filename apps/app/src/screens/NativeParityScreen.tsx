import { Link } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import homeBannerImage from "../../assets/home-banner.png";
import {
  mobileShellLayout,
  profileHubMenuItems,
  profileHubSubNavItems,
  webBrowseShortcuts,
  webMobileBottomNavItems,
  webSampleShopCards,
} from "@mobile/design/webDesignParity";
import { findRouteById, mobileParityRoutes, type MobileRouteId } from "@mobile/navigation/routes";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type NativeParityScreenProps = {
  detailLabel?: string;
  routeId: MobileRouteId;
};

type HomeOfferCard = {
  cashback: string;
  category: string;
  label: string;
  title: string;
};

type HomeOfferSectionModel = {
  action: string;
  cards: readonly HomeOfferCard[];
  title: string;
};

const homeOfferSections: readonly HomeOfferSectionModel[] = [
  {
    title: "Top Brands",
    action: "View all",
    cards: webSampleShopCards,
  },
  {
    title: "Trending Brands",
    action: "View all",
    cards: [
      {
        category: "Travel",
        cashback: "8%",
        label: "Grab Coupon",
        title: "Travel cashback stores",
      },
      {
        category: "Shopping",
        cashback: "10%",
        label: "Grab Coupon",
        title: "Trending shopping rewards",
      },
      {
        category: "Electronics",
        cashback: "6%",
        label: "Grab Coupon",
        title: "Popular device deals",
      },
    ],
  },
  {
    title: "Travel Deals are Here!",
    action: "View all",
    cards: [
      {
        category: "Travel",
        cashback: "8%",
        label: "Grab Coupon",
        title: "Hotel and flight rewards",
      },
      {
        category: "Travel",
        cashback: "7%",
        label: "Grab Coupon",
        title: "Booking cashback picks",
      },
      {
        category: "Travel",
        cashback: "5%",
        label: "Grab Coupon",
        title: "Weekend travel deals",
      },
    ],
  },
  {
    title: "Makeup Must Have!",
    action: "View all",
    cards: [
      {
        category: "Beauty",
        cashback: "12%",
        label: "Grab Coupon",
        title: "Beauty store rewards",
      },
      {
        category: "Beauty",
        cashback: "9%",
        label: "Grab Coupon",
        title: "Skincare cashback picks",
      },
      {
        category: "Beauty",
        cashback: "6%",
        label: "Grab Coupon",
        title: "Makeup deals",
      },
    ],
  },
] as const;

export function NativeParityScreen({ detailLabel, routeId }: NativeParityScreenProps) {
  const insets = useSafeAreaInsets();
  const route = findRouteById(routeId);
  const isHome = route.id === "home";
  const searchTopPadding = Math.max(8, insets.top + 8);
  const bottomNavPadding = Math.max(14, insets.bottom + 8);

  return (
    <View style={styles.viewport}>
      <View style={styles.phoneFrame} testID="mobile-phone-frame">
        <View style={styles.shell}>
          <View style={[styles.stickySearch, { paddingTop: searchTopPadding }]}>
            <View style={styles.searchPill}>
              <Text style={styles.searchIcon}>⌕</Text>
              <Text style={styles.searchPlaceholder}>Search shops, brands, cashback</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
            {isHome ? (
              <HomeDesignParityContent />
            ) : (
              <RouteDesignParityContent detailLabel={detailLabel} routeId={route.id} />
            )}
          </ScrollView>

          <WebMobileBottomNav activeRouteId={route.id} bottomPadding={bottomNavPadding} />
        </View>
      </View>
    </View>
  );
}

function HomeDesignParityContent() {
  return (
    <>
      <BrowseShortcuts />

      <HomeBanner />

      <GoLinkWebBanner />

      {homeOfferSections.map((section) => (
        <HomeOfferSection
          action={section.action}
          cards={section.cards}
          key={section.title}
          title={section.title}
        />
      ))}
    </>
  );
}

function HomeBanner() {
  return (
    <View style={styles.homeBannerFrame}>
      <Image
        accessibilityLabel="GoGoCash home banner"
        alt="GoGoCash home banner"
        resizeMode="cover"
        source={homeBannerImage}
        style={styles.homeBannerImage}
      />
    </View>
  );
}

function GoLinkWebBanner() {
  return (
    <View style={styles.webGoLinkBanner}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.goLinkIllustration}
      >
        <View style={styles.goLinkIllustrationCard}>
          <Text style={styles.goLinkIllustrationIcon}>∞</Text>
        </View>
        <View style={styles.goLinkIllustrationLine} />
        <View style={styles.goLinkIllustrationLineShort} />
      </View>
      <View style={styles.webGoLinkCopy}>
        <Text style={styles.webGoLinkTitle}>
          GoGoLink – Easy to earn cashback by just copy, paste and shop!
        </Text>
        <View style={styles.webGoLinkForm}>
          <View style={styles.webGoLinkInput}>
            <Text style={styles.searchIcon}>∞</Text>
            <Text numberOfLines={1} style={styles.goLinkInputText}>
              Paste your product or shop link here
            </Text>
          </View>
          <Text style={styles.webGoLinkCta}>Paste and Go</Text>
        </View>
      </View>
    </View>
  );
}

function HomeOfferSection({
  action,
  cards,
  title,
}: {
  action: string;
  cards: readonly HomeOfferCard[];
  title: string;
}) {
  return (
    <View style={styles.offerSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionAction}>{action}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.offerCardRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {cards.map((card) => (
          <ShopCard key={`${title}-${card.title}`} {...card} />
        ))}
      </ScrollView>
    </View>
  );
}

function RouteDesignParityContent({
  detailLabel,
  routeId,
}: {
  detailLabel?: string;
  routeId: MobileRouteId;
}) {
  const route = findRouteById(routeId);

  if (route.id === "profile") {
    return <ProfileHubContent />;
  }
  if (route.id === "wallet") {
    return <WalletHubContent />;
  }
  if (route.id === "quest") {
    return <QuestHubContent />;
  }
  if (route.id === "golink") {
    return <GoLinkHubContent />;
  }

  const relatedRoutes = mobileParityRoutes
    .filter(
      (candidate) => candidate.featureGroup === route.featureGroup && candidate.id !== route.id
    )
    .slice(0, 4);

  return (
    <>
      <BrowseShortcuts />
      <View style={styles.routeHero}>
        <View style={styles.routeIcon}>
          <Text style={styles.routeIconText}>G</Text>
        </View>
        <View style={styles.routeCopy}>
          <Text style={styles.kickerText}>{route.featureGroup}</Text>
          <Text style={styles.routeTitle}>{route.title}</Text>
          <Text style={styles.routeBody}>
            Matches the GoGoCash web mobile shell: sticky search, rounded white cards, mint accents,
            and bottom navigation.
          </Text>
        </View>
      </View>

      {detailLabel ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Route parameter</Text>
          <Text style={styles.detailValue}>{detailLabel}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Screen contract</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Web route</Text>
          <Text style={styles.rowValue}>{route.webPath}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Native path</Text>
          <Text style={styles.rowValue}>{route.nativePath}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Auth</Text>
          <Text style={styles.rowValue}>{route.requiresAuth ? "Secure session" : "Public"}</Text>
        </View>
      </View>

      {route.requiresAuth ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Uses the same secure account expectation as the web profile and wallet routes.
          </Text>
        </View>
      ) : null}

      {relatedRoutes.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Related web screens</Text>
          <View style={styles.links}>
            {relatedRoutes.map((relatedRoute) => (
              <Link
                href={relatedRoute.nativePath as never}
                key={relatedRoute.id}
                style={styles.link}
              >
                {relatedRoute.title}
              </Link>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

function BrowseShortcuts() {
  return (
    <ScrollView
      contentContainerStyle={styles.shortcutRow}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {webBrowseShortcuts.map((tile) => (
        <Link asChild href={tile.href as never} key={tile.id}>
          <Pressable style={styles.shortcutPill}>
            <Text style={styles.shortcutIcon}>{getShortcutGlyph(tile.icon)}</Text>
            <Text style={styles.shortcutText}>{tile.label}</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

function ProfileHubContent() {
  return (
    <View style={styles.profileHub} testID="profile-hub-screen">
      <Text style={styles.profilePageTitle}>Profile</Text>
      <WalletSummaryCard />
      <View style={styles.profilePanel}>
        <ProfileNavRow active href="/profile" icon="●" label="Profile" />
        <View style={styles.profileSubNav}>
          {profileHubSubNavItems.map((item) => (
            <Link asChild href={item.href as never} key={item.href}>
              <Pressable style={styles.profileSubNavRow}>
                <Text style={styles.profileSubNavText}>{item.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
        {profileHubMenuItems.slice(1).map((item) => (
          <ProfileNavRow
            external={"external" in item && item.external === true}
            href={item.href}
            icon={getProfileMenuGlyph(item.label)}
            key={item.label}
            label={item.label}
          />
        ))}
        <Pressable style={styles.logoutRow}>
          <Text style={styles.profileRowIcon}>⇥</Text>
          <Text style={styles.profileRowText}>Log Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WalletSummaryCard() {
  return (
    <View style={styles.walletSummaryCard}>
      <View style={styles.walletHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>G</Text>
        </View>
        <View style={styles.walletUserCopy}>
          <Text style={styles.walletUserName}>USER</Text>
          <Text style={styles.walletUserId}>****</Text>
        </View>
      </View>
      <View style={styles.walletBody}>
        <Text style={styles.walletLabel}>Total Cashback Available</Text>
        <View style={styles.walletAmountRow}>
          <Text style={styles.walletAmount}>0.00</Text>
          <Text style={styles.walletCurrency}>USD</Text>
        </View>
        <Link asChild href="/withdraw">
          <Pressable style={styles.withdrawButton}>
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
            <Text style={styles.withdrawButtonText}>↗</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function WalletHubContent() {
  return (
    <View style={styles.p0Screen}>
      <Text style={styles.profilePageTitle}>Wallet</Text>
      <WalletSummaryCard />
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Transaction History</Text>
          <Text style={styles.sectionAction}>Filter</Text>
        </View>
        <View style={styles.tabStrip}>
          {["All", "Earning", "Withdraw"].map((tab, index) => (
            <Text key={tab} style={[styles.tabPill, index === 0 ? styles.tabPillActive : null]}>
              {tab}
            </Text>
          ))}
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No transactions yet</Text>
          <Text style={styles.emptyStateBody}>
            Cashback, earning, and withdraw activity will appear here after tracked orders settle.
          </Text>
        </View>
      </View>
    </View>
  );
}

function QuestHubContent() {
  return (
    <View style={styles.p0Screen}>
      <View style={styles.questHero}>
        <Text style={styles.kickerText}>GoGoQuest</Text>
        <Text style={styles.questTitle}>Quest</Text>
        <Text style={styles.questBody}>
          Complete missions, climb the leaderboard, and check your reward history.
        </Text>
      </View>
      <View style={styles.tabStrip}>
        {["Tasks", "Shops", "History"].map((tab, index) => (
          <Text key={tab} style={[styles.tabPill, index === 0 ? styles.tabPillActive : null]}>
            {tab}
          </Text>
        ))}
      </View>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>GoGoQuest</Text>
          <Link href="/quest/history" style={styles.sectionAction}>
            History
          </Link>
        </View>
        {["Shop through GoGoCash", "Earn extra points", "Track your rank"].map((item, index) => (
          <View key={item} style={styles.questTaskRow}>
            <View style={styles.questTaskBadge}>
              <Text style={styles.questTaskBadgeText}>{index + 1}</Text>
            </View>
            <View style={styles.questTaskCopy}>
              <Text style={styles.profileRowText}>{item}</Text>
              <Text style={styles.emptyStateBody}>Available during the active quest round.</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function GoLinkHubContent() {
  return (
    <View style={styles.p0Screen}>
      <View style={styles.goLinkHero}>
        <Text style={styles.kickerText}>GoLink</Text>
        <Text style={styles.goLinkTitle}>Create cashback links</Text>
        <Text style={styles.goLinkBody}>
          Paste a product link and continue shopping with GoGoCash tracking.
        </Text>
        <View style={styles.goLinkInputMock}>
          <Text style={styles.searchIcon}>∞</Text>
          <Text style={styles.goLinkInputText}>Paste product link</Text>
        </View>
        <Text style={styles.goLinkPrimaryButton}>Paste and Go</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How it works</Text>
        {[
          "Copy a shop or product link",
          "Paste product link here",
          "Open the tracked cashback link",
        ].map((step, index) => (
          <View key={step} style={styles.questTaskRow}>
            <View style={styles.questTaskBadge}>
              <Text style={styles.questTaskBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.profileRowText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProfileNavRow({
  active = false,
  external = false,
  href,
  icon,
  label,
}: {
  active?: boolean;
  external?: boolean;
  href: string;
  icon: string;
  label: string;
}) {
  const row = (
    <Pressable
      style={StyleSheet.flatten([styles.profileRow, active ? styles.profileRowActive : null])}
    >
      <Text style={[styles.profileRowIcon, active ? styles.profileRowIconActive : null]}>
        {icon}
      </Text>
      <Text style={[styles.profileRowText, active ? styles.profileRowTextActive : null]}>
        {label}
      </Text>
      {external ? <Text style={styles.profileExternal}>↗</Text> : null}
    </Pressable>
  );

  return (
    <Link
      asChild
      href={href as never}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {row}
    </Link>
  );
}

function WebMobileBottomNav({
  activeRouteId,
  bottomPadding,
}: {
  activeRouteId: MobileRouteId;
  bottomPadding: number;
}) {
  return (
    <View style={[styles.bottomNavSafe, { paddingBottom: bottomPadding }]}>
      <View style={styles.bottomNav}>
        {webMobileBottomNavItems.map((item) => {
          const isActive = isBottomNavActive(activeRouteId, item.href);
          const emphasized = "emphasized" in item && item.emphasized === true;
          const itemContent = (
            <>
              <View
                style={[
                  emphasized ? styles.walletButton : styles.navIconWrap,
                  isActive && !emphasized ? styles.navIconWrapActive : null,
                ]}
              >
                <Text style={emphasized ? styles.walletIcon : styles.navIcon}>
                  {getBottomNavGlyph(item.icon)}
                </Text>
              </View>
              <Text
                style={[
                  styles.navLabel,
                  isActive || emphasized ? styles.navLabelActive : styles.navLabelInactive,
                ]}
              >
                {item.label}
              </Text>
            </>
          );

          return (
            <Link
              href={item.href as never}
              key={item.href}
              style={[styles.navItem, emphasized ? styles.walletNavItem : null]}
            >
              {itemContent}
            </Link>
          );
        })}
      </View>
    </View>
  );
}

function ShopCard({
  cashback,
  category,
  label,
  title,
}: {
  cashback: string;
  category: string;
  label: string;
  title: string;
}) {
  return (
    <View style={styles.shopCard}>
      <View style={styles.shopImage}>
        <Text style={styles.shopBadge}>{label}</Text>
      </View>
      <View style={styles.shopMetaRow}>
        <Text style={styles.categoryChip}>{category}</Text>
        <Text style={styles.favorite}>♡</Text>
      </View>
      <View style={styles.shopTitleRow}>
        <View style={styles.shopTitleCopy}>
          <Text style={styles.shopTitle}>{title}</Text>
          <Text style={styles.cashbackLabel}>Cashback up to</Text>
        </View>
        <Text style={styles.cashbackValue}>{cashback}</Text>
      </View>
    </View>
  );
}

function isBottomNavActive(routeId: MobileRouteId, href: string): boolean {
  const route = findRouteById(routeId);

  if (href === "/") {
    return route.id === "home";
  }

  return route.nativePath === href || route.webPath === href;
}

function getShortcutGlyph(icon: string): string {
  switch (icon) {
    case "shop":
      return "□";
    case "shops":
      return "▦";
    case "promotion":
      return "%";
    case "education":
      return "◇";
    default:
      return "•";
  }
}

function getBottomNavGlyph(icon: string): string {
  switch (icon) {
    case "home":
      return "⌂";
    case "golink":
      return "∞";
    case "wallet":
      return "◉";
    case "quest":
      return "★";
    case "profile":
      return "●";
    default:
      return "•";
  }
}

function getProfileMenuGlyph(label: string): string {
  if (label.includes("Wallet")) return "◉";
  if (label.includes("Favorite")) return "♡";
  if (label.includes("Quest")) return "★";
  if (label.includes("Refer")) return "+";
  if (label.includes("Privacy") || label.includes("Consent")) return "◌";
  if (label.includes("Help")) return "?";
  if (label.includes("Connect")) return "◎";
  if (label.includes("Missing")) return "!";
  if (label.includes("Age")) return "✓";
  if (label.includes("Membership")) return "◆";

  return "•";
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: "rgba(255,255,255,0.78)",
    borderRadius: 26,
    borderWidth: 3,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
  },
  bottomNav: {
    alignItems: "flex-end",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: 448,
    paddingHorizontal: 12,
    paddingVertical: 12,
    boxShadow: shadows.bottomNavCss,
    width: "100%",
  },
  bottomNavSafe: {
    bottom: 0,
    left: 0,
    paddingBottom: 14,
    paddingHorizontal: 8,
    position: "absolute",
    right: 0,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    boxShadow: shadows.cardCss,
  },
  cardGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  cashbackLabel: {
    color: colors.textSoft,
    fontSize: 8,
  },
  cashbackValue: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
  },
  categoryChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.chip,
    color: colors.primaryDark,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryIcon: {
    color: colors.primaryDark,
    fontSize: 18,
  },
  categoryText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  categoryTile: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: "48%",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  detailCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  detailLabel: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  detailValue: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  emptyStateBody: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyStateTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  extraRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  favorite: {
    color: colors.primaryDark,
    fontSize: 18,
    lineHeight: 20,
  },
  goLinkBanner: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  goLinkBody: {
    color: "#35665A",
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  goLinkCta: {
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goLinkHero: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.lg,
  },
  goLinkInputMock: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "rgba(0,170,128,0.35)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  goLinkInputText: {
    color: "#5C726B",
    fontSize: typography.body,
  },
  goLinkPrimaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.md,
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
  goLinkTitle: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
    marginTop: spacing.sm,
  },
  goLinkIllustration: {
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderColor: "rgba(0, 170, 128, 0.16)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    minHeight: 126,
    overflow: "hidden",
    padding: spacing.lg,
    width: "100%",
  },
  goLinkIllustrationCard: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 62,
    justifyContent: "center",
    width: 62,
  },
  goLinkIllustrationIcon: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "700",
  },
  goLinkIllustrationLine: {
    backgroundColor: "rgba(0, 170, 128, 0.16)",
    borderRadius: radii.chip,
    height: 16,
    width: "78%",
  },
  goLinkIllustrationLineShort: {
    backgroundColor: "rgba(0, 170, 128, 0.12)",
    borderRadius: radii.chip,
    height: 16,
    width: "54%",
  },
  homeBannerFrame: {
    aspectRatio: mobileShellLayout.homeBannerAspectRatio,
    backgroundColor: colors.card,
    borderColor: "rgba(0, 0, 0, 0.06)",
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: "0 12px 40px rgba(12, 20, 18, 0.08)",
    overflow: "hidden",
    width: "100%",
  },
  homeBannerImage: {
    height: "100%",
    width: "100%",
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    justifyContent: "center",
    minHeight: 96,
    minWidth: 96,
    padding: spacing.md,
  },
  heroBadgeLabel: {
    color: colors.textSoft,
    fontSize: typography.caption,
    marginTop: 2,
  },
  heroBadgeValue: {
    color: colors.primaryDark,
    fontSize: 32,
    fontWeight: "700",
  },
  heroBanner: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 210,
    overflow: "hidden",
    padding: spacing.lg,
  },
  heroBody: {
    color: "rgba(255,255,255,0.88)",
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  heroCopy: {
    flex: 1,
    justifyContent: "center",
  },
  heroTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
    marginTop: spacing.sm,
  },
  infoBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  infoTile: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  infoTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  kickerText: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  link: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.chip,
    color: colors.primaryDark,
    fontSize: typography.body,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  logoutRow: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    height: 52,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  navIcon: {
    color: colors.muted,
    fontSize: 20,
    fontWeight: "800",
  },
  navIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 28,
    justifyContent: "center",
    width: 48,
  },
  navIconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    gap: 6,
    justifyContent: "flex-end",
    minHeight: 52,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "400",
  },
  navLabelActive: {
    color: colors.primary,
  },
  navLabelInactive: {
    color: "#6D7B73",
  },
  notice: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  noticeText: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 23,
  },
  offerCardRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  offerSection: {
    gap: spacing.md,
  },
  page: {
    backgroundColor: colors.background,
    gap: spacing.homeStackGap,
    minHeight: "100%",
    paddingBottom: mobileShellLayout.bottomNavClearance + 18,
    paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
    paddingTop: spacing.homeStackGap,
  },
  phoneFrame: {
    alignSelf: "center",
    flex: 1,
    maxWidth: mobileShellLayout.contentMaxWidth,
    position: "relative",
    width: "100%",
  },
  p0Screen: {
    gap: spacing.homeStackGap,
  },
  profileExternal: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  profileHub: {
    gap: spacing.homeStackGap,
  },
  profilePageTitle: {
    color: "#103522",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
  profilePanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 8,
    padding: spacing.md,
  },
  profileRow: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    height: 52,
    paddingHorizontal: spacing.md,
  },
  profileRowActive: {
    backgroundColor: colors.primary,
  },
  profileRowIcon: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    width: 24,
  },
  profileRowIconActive: {
    color: colors.white,
  },
  profileRowText: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
  },
  profileRowTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  profileSubNav: {
    gap: 6,
    marginLeft: 38,
    marginTop: -2,
  },
  profileSubNavRow: {
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  profileSubNavText: {
    color: colors.ink,
    fontSize: 14,
  },
  questBody: {
    color: "rgba(255,255,255,0.86)",
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  questHero: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    minHeight: 190,
    overflow: "hidden",
    padding: spacing.lg,
  },
  questTaskBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  questTaskBadgeText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  questTaskCopy: {
    flex: 1,
    gap: 2,
  },
  questTaskRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 58,
    paddingVertical: spacing.sm,
  },
  questTitle: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
    marginTop: spacing.sm,
  },
  routeBody: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  routeCopy: {
    flex: 1,
  },
  routeHero: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  routeIcon: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  routeIconText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
  },
  routeTitle: {
    color: colors.ink,
    fontSize: typography.headline,
    fontWeight: "700",
    lineHeight: 34,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: typography.body,
  },
  rowValue: {
    color: colors.ink,
    flexShrink: 1,
    fontSize: typography.body,
    fontWeight: "700",
    textAlign: "right",
  },
  searchIcon: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "800",
  },
  searchPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    maxWidth: 448,
    paddingHorizontal: spacing.md,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
    width: "100%",
  },
  searchPlaceholder: {
    color: colors.textSoft,
    flexShrink: 1,
    fontSize: typography.body,
  },
  sectionAction: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  sectionEyebrow: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#103522",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 30,
  },
  shell: {
    backgroundColor: colors.background,
    flex: 1,
    position: "relative",
  },
  shopBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 10,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shopCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
    minWidth: 152,
    padding: 8,
    boxShadow: "0 2px 2px rgba(0, 0, 0, 0.05)",
    width: 152,
  },
  shopImage: {
    aspectRatio: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    padding: 6,
  },
  shopMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shopTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  shopTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  shopTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  shortcutIcon: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "700",
  },
  shortcutPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    flexShrink: 0,
    height: mobileShellLayout.shortcutPillHeight,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
  },
  shortcutRow: {
    alignItems: "flex-start",
    gap: 8,
    paddingRight: spacing.md,
  },
  shortcutText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  stickySearch: {
    backgroundColor: colors.background,
    paddingBottom: 8,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
    zIndex: 1,
  },
  tabPill: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textAlign: "center",
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
  },
  tabStrip: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    width: "100%",
  },
  webGoLinkBanner: {
    backgroundColor: "#EAF4FF",
    borderColor: "#D3EFE7",
    borderRadius: 32,
    borderWidth: 1,
    boxShadow: "0 25px 75px rgba(7, 33, 102, 0.12)",
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.lg,
  },
  webGoLinkCopy: {
    gap: spacing.md,
  },
  webGoLinkCta: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  webGoLinkForm: {
    gap: spacing.sm,
  },
  webGoLinkInput: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(0, 170, 128, 0.35)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    minWidth: 0,
    paddingHorizontal: spacing.md,
  },
  webGoLinkTitle: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    paddingRight: spacing.md,
  },
  walletAmount: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: "700",
    lineHeight: 45,
  },
  walletAmountRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
  },
  walletBody: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.36)",
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: -8,
    padding: spacing.md,
  },
  walletCurrency: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  walletHeader: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 84,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  walletLabel: {
    color: colors.ink,
    fontSize: 12,
  },
  walletSummaryCard: {
    borderRadius: 13,
    boxShadow: "0 4px 24px rgba(12, 20, 18, 0.12)",
    height: 260,
    overflow: "hidden",
    width: "100%",
  },
  walletUserCopy: {
    alignItems: "flex-end",
    gap: 4,
  },
  walletUserId: {
    color: "#83F2D6",
    fontSize: 12,
  },
  walletUserName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  walletButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primarySoft,
    borderRadius: 32,
    borderWidth: 8,
    height: 64,
    justifyContent: "center",
    marginTop: -32,
    boxShadow: "0 16px 30px rgba(0, 204, 153, 0.28)",
    width: 64,
  },
  walletIcon: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
  },
  walletNavItem: {
    minHeight: 76,
  },
  withdrawButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: 8,
    height: 44,
    justifyContent: "center",
    marginTop: spacing.xs,
    paddingHorizontal: 24,
    width: "100%",
  },
  withdrawButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
