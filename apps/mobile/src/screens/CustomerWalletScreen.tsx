import { Link } from "expo-router";
import {
  Banknote as BanknoteIcon,
  CalendarDays as CalendarIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ExternalLink as ExternalLinkIcon,
  Headphones as HeadphonesIcon,
  HelpCircle as HelpCircleIcon,
  Hourglass as HourglassIcon,
  Search as SearchIcon,
  WalletCards as WalletCardsIcon,
} from "@mobile/theme/icons";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import walletNoDataImage from "../../assets/wallet-no-data.png";
import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { WalletSkeleton } from "@mobile/components/Skeleton";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  webWalletAccessibleSummary,
  webWalletCashbackSummary,
  webWalletEmptyState,
  webWalletSupportBanner,
  webWalletTransactionTabs,
} from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type WalletMetric = (typeof webWalletCashbackSummary.metrics)[number];

export function CustomerWalletScreen() {
  const tc = useCopy();
  const walletResource = useCustomerAccountResource({
    fixtureData: webWalletCashbackSummary,
    resourceId: "wallet",
  });

  if (walletResource.status !== "ready") {
    return (
      <CustomerAccountResourceState
        emptyBody={tc("Your cashback wallet does not have any backend activity yet.")}
        emptyTitle={tc("No wallet activity yet")}
        loadingSkeleton={<WalletSkeleton />}
        resource={walletResource}
        resourceLabel="wallet"
      />
    );
  }

  return (
    <AccountPageShell activeRouteId="wallet" showProfileRail showTitle={false} title={tc("My Wallet")}>
      <WalletHeader />
      <WalletSupportBanner />
      <WalletCashbackSummary />
      <WalletTransactions onRefresh={walletResource.retry} />
    </AccountPageShell>
  );
}

// Transactions list with pull-to-refresh. The wallet dashboard re-reads the same
// fixture today (mock build), so onRefresh wires straight to the resource's existing
// refetch (walletResource.retry) — the affordance + wiring is the deliverable. The
// RefreshControl label reuses the existing catalog string `walletTransactionsLoading`
// ("Loading transactions…" -> Thai via reverse-lookup), so no new copy is introduced.
function WalletTransactions({ onRefresh }: { onRefresh: () => void }) {
  const tc = useCopy();
  return (
    <View style={styles.transactionArea}>
      <View style={styles.tabStrip}>
        {webWalletTransactionTabs.map((tab, index) => (
          <Text key={tab} style={[styles.tabButton, index === 0 ? styles.tabButtonActive : null]}>
            {tc(tab)}
          </Text>
        ))}
      </View>
      <View style={styles.filterRow}>
        <FilterPill icon="search" label="Search" />
        <FilterPill icon="calendar" label="Date Range" />
        <FilterPill icon="status" label="Status" />
      </View>
      <ScrollView
        contentContainerStyle={styles.tableScrollContent}
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={false}
            title={tc("Loading transactions…")}
          />
        }
        style={styles.tableShell}
      >
        <View style={styles.emptyWallet}>
          <Image
            alt={tc("Wallet empty state illustration")}
            resizeMode="contain"
            source={walletNoDataImage}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyTitle}>{tc(webWalletEmptyState.title)}</Text>
          <Text style={styles.emptySubtitle}>{tc(webWalletEmptyState.subtitle)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function WalletHeader() {
  const tc = useCopy();
  return (
    <View style={styles.walletHeader}>
      <Link asChild href="/profile">
        <MotionPressable
          accessibilityLabel={tc("Back to Profile")}
          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
          pressScale={0.98}
          style={styles.backButton}
        >
          <ChevronLeftIcon
            color={colors.accent}
            size={28}
            strokeWidth={typography.iconStrokeWidth}
          />
        </MotionPressable>
      </Link>
      <Text style={styles.walletHeaderTitle}>{tc("My Wallet")}</Text>
    </View>
  );
}

function WalletSupportBanner() {
  const tc = useCopy();
  return (
    <View style={styles.supportBanner}>
      <HeadphonesIcon color={colors.ink} size={32} strokeWidth={typography.iconStrokeWidth} />
      <View style={styles.supportCopy}>
        <Text style={styles.supportLine}>{tc(webWalletSupportBanner.line1)}</Text>
        <Text style={styles.supportLine}>{tc(webWalletSupportBanner.line2)}</Text>
      </View>
      <Link asChild href="https://lin.ee/7om5sAr">
        <MotionPressable pressScale={0.98} style={styles.supportContactCard}>
          <View style={styles.lineBadge}>
            <Text style={styles.lineBadgeText}>LINE</Text>
          </View>
          <View style={styles.supportContactCopy}>
            <Text style={styles.supportContactTitle}>{tc(webWalletSupportBanner.title)}</Text>
            <Text style={styles.supportContactSubtitle}>{tc(webWalletSupportBanner.subtitle)}</Text>
          </View>
          <ExternalLinkIcon color="#7EA3CA" size={20} strokeWidth={typography.iconStrokeWidth} />
        </MotionPressable>
      </Link>
    </View>
  );
}

function WalletCashbackSummary() {
  const tc = useCopy();
  return (
    <View accessibilityLabel={webWalletAccessibleSummary} style={styles.cashbackSummaryCard}>
      <View style={styles.cashbackHeader}>
        <View style={styles.cashbackHeaderCopy}>
          <Text style={styles.cashbackTitle}>{tc(webWalletCashbackSummary.title)}</Text>
          <Text style={styles.cashbackSubtitle}>{tc(webWalletCashbackSummary.subtitle)}</Text>
        </View>
        <HelpCircleIcon color="#7089A5" size={28} strokeWidth={2.4} />
      </View>
      <View style={styles.walletMetricStack}>
        {webWalletCashbackSummary.metrics.map((metric) => (
          <WalletMetricCard key={metric.label} metric={metric} />
        ))}
      </View>
    </View>
  );
}

function WalletMetricCard({ metric }: { metric: WalletMetric }) {
  const tc = useCopy();
  // Icon selection keys off the raw English label (a stable discriminant), not the translated copy.
  const Icon =
    metric.label === "Total Cashback"
      ? WalletCardsIcon
      : metric.label === "Pending Cashback"
        ? HourglassIcon
        : BanknoteIcon;

  return (
    <View style={[styles.metricCard, metric.primary ? styles.metricCardPrimary : null]}>
      <View style={styles.metricTopRow}>
        <View style={[styles.metricIcon, metric.primary ? styles.metricIconPrimary : null]}>
          <Icon
            color={metric.primary ? colors.white : colors.primaryDark}
            size={20}
            strokeWidth={typography.iconStrokeWidth}
          />
        </View>
        <View style={styles.metricCopy}>
          <Text style={styles.metricLabel}>{tc(metric.label)}</Text>
          <Text style={styles.metricHint}>{tc(metric.hint)}</Text>
        </View>
      </View>
      <View style={styles.metricAmountRow}>
        <Text style={styles.metricAmount}>{metric.amount}</Text>
        <Text style={styles.metricCurrency}>{metric.currency}</Text>
      </View>
    </View>
  );
}

function FilterPill({ icon, label }: { icon: "calendar" | "search" | "status"; label: string }) {
  const tc = useCopy();
  const Icon =
    icon === "search" ? SearchIcon : icon === "calendar" ? CalendarIcon : ChevronDownIcon;

  return (
    <View style={styles.filterPill}>
      <Icon color={colors.textSoft} size={18} strokeWidth={typography.iconStrokeWidth} />
      <Text style={styles.filterText}>{tc(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  walletHeader: {
    alignItems: "center",
    borderBottomColor: "#C9D9E8",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 34,
  },
  walletHeaderTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: "700",
  },
  supportBanner: {
    backgroundColor: "#CFE6FF",
    borderRadius: radii.lg,
    gap: spacing.md,
    padding: spacing.lg,
  },
  supportCopy: {
    gap: spacing.xs,
  },
  supportLine: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 18,
    lineHeight: 28,
  },
  supportContactCard: {
    alignItems: "center",
    backgroundColor: "#E8F3FF",
    borderColor: "#C8DDF3",
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: "0 4px 14px rgba(64, 100, 130, 0.12)",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
  },
  lineBadge: {
    alignItems: "center",
    backgroundColor: "#D5F4EF",
    borderRadius: radii.sm,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  lineBadgeText: {
    color: "#06C755",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "800",
  },
  supportContactCopy: {
    flex: 1,
    gap: 2,
  },
  supportContactTitle: {
    color: "#1B3854",
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
  },
  supportContactSubtitle: {
    color: "#6E88A5",
    fontFamily: typography.family,
    fontSize: typography.body,
  },
  cashbackSummaryCard: {
    backgroundColor: "#DDF0FF",
    borderColor: "#BCD8EF",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  cashbackHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  cashbackHeaderCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  cashbackTitle: {
    color: "#314761",
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "800",
  },
  cashbackSubtitle: {
    color: "#7289A0",
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 24,
  },
  walletMetricStack: {
    gap: spacing.md,
  },
  metricCard: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "#C6D8E9",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  metricCardPrimary: {
    backgroundColor: "#E4F8F9",
    borderColor: "rgba(0, 204, 153, 0.25)",
  },
  metricTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  metricIcon: {
    alignItems: "center",
    backgroundColor: "#EEF9FA",
    borderRadius: radii.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  metricIconPrimary: {
    backgroundColor: colors.primaryDark,
  },
  metricCopy: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    color: "#1B3854",
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
  },
  metricHint: {
    color: "#7289A0",
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 22,
  },
  metricAmountRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.xs,
  },
  metricAmount: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 28,
    fontWeight: "800",
  },
  metricCurrency: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "600",
  },
  transactionArea: {
    gap: spacing.md,
    width: "100%",
  },
  tabStrip: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
  },
  tabButton: {
    backgroundColor: "#F0F0F0",
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    color: colors.muted,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "600",
    minHeight: 44,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
  tabButtonActive: {
    backgroundColor: colors.card,
    color: colors.primaryDark,
    borderBottomColor: colors.primary,
    borderBottomWidth: 2,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filterPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: spacing.md,
  },
  filterText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  tableShell: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E0E0E0",
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    overflow: "hidden",
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  emptyWallet: {
    alignItems: "center",
    backgroundColor: colors.card,
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 280,
    paddingHorizontal: spacing.lg,
    paddingVertical: 48,
  },
  emptyImage: {
    height: 123,
    opacity: 0.62,
    width: 190,
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "500",
    lineHeight: 26,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 22,
    maxWidth: 420,
    textAlign: "center",
  },
});
