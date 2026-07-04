import { Link } from "expo-router";
import {
  Banknote as BanknoteIcon,
  CalendarDays as CalendarIcon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ExternalLink as ExternalLinkIcon,
  Headphones as HeadphonesIcon,
  HelpCircle as HelpCircleIcon,
  Hourglass as HourglassIcon,
  Search as SearchIcon,
  WalletCards as WalletCardsIcon,
} from "@mobile/theme/icons";
import { useState } from "react";
import {
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import walletNoDataImage from "../../assets/wallet-no-data.png";
import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { WalletSkeleton } from "@mobile/components/Skeleton";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { mapCheckWithdrawToWalletMetrics, type WalletMetricView } from "@mobile/api/walletMapper";
import { isCheckWithdrawResponse, isWalletResourceBlocking } from "@mobile/api/walletTypes";
import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  mobileShellLayout,
  webWalletAccessibleSummary,
  webWalletCashbackSummary,
  webWalletEmptyState,
  webWalletSupportBanner,
  webWalletTransactionTabs,
} from "@mobile/design/webDesignParity";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

// Widened to the live view shape so fixture rows and backend-mapped rows
// share one metric card type (fixture literals are assignable to it).
type WalletMetric = WalletMetricView;

export function CustomerWalletScreen() {
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const walletResource = useCustomerAccountResource({
    fixtureData: webWalletCashbackSummary,
    resourceId: "wallet",
  });
  // Money rule: live amounts are backend-derived or zero — the fixture's demo
  // balances must never render as real money. Fixtures mode rejects the guard
  // and stays byte-identical.
  const liveMetrics = isCheckWithdrawResponse(walletResource.data)
    ? mapCheckWithdrawToWalletMetrics(walletResource.data, webWalletCashbackSummary.metrics)
    : walletResource.status === "empty"
      ? mapCheckWithdrawToWalletMetrics(
          { netAmount: 0, netAmountTHB: 0, totalPayoutTHB: 0, totalPayoutUSD: 0 },
          webWalletCashbackSummary.metrics,
        )
      : null;

  const walletShellWhileLoading = walletResource.status === "loading";

  if (isWalletResourceBlocking(walletResource.status)) {
    return (
      <AccountPageShell activeRouteId="wallet" showProfileRail showTitle={false} title={tc("My Wallet")}>
        {isDesktop ? null : <WalletHeader />}
        <CustomerAccountResourceState
          embedded
          loadingSkeleton={<WalletSkeleton />}
          resource={walletResource}
          resourceLabel="wallet"
        />
      </AccountPageShell>
    );
  }

  if (walletShellWhileLoading) {
    return (
      <AccountPageShell activeRouteId="wallet" showProfileRail showTitle={false} title={tc("My Wallet")}>
        {isDesktop ? null : <WalletHeader />}
        <WalletSupportBanner />
        <WalletSkeleton />
      </AccountPageShell>
    );
  }

  return (
    <AccountPageShell activeRouteId="wallet" showProfileRail showTitle={false} title={tc("My Wallet")}>
      {/* Mobile-only back link + title — on desktop the persistent sidebar replaces it (web parity). */}
      {isDesktop ? null : <WalletHeader />}
      <WalletSupportBanner />
      <WalletCashbackSummary liveMetrics={liveMetrics} />
      <WalletTransactions onRefresh={walletResource.retry} />
    </AccountPageShell>
  );
}

// Transactions list with pull-to-refresh. The wallet dashboard re-reads the same
// fixture today (mock build), so onRefresh wires straight to the resource's existing
// refetch (walletResource.retry) — the affordance + wiring is the deliverable. The
// RefreshControl label reuses the existing catalog string `walletTransactionsLoading`
// ("Loading transactions…" -> Thai via reverse-lookup), so no new copy is introduced.
// Mock transaction rows (local — the shared webWalletPage fixture ships none and is parallel-owned).
// Covers every case: earning + withdraw × success / pending / failed, spread across dates so the
// Date Range filter is demonstrable. Tabs 0/1/2 = All / Earning / Withdraw (webWalletTransactionTabs order).
type WalletTxKind = "earn" | "withdraw";
type WalletTxStatus = "success" | "pending" | "failed";
type WalletTxRow = {
  id: string;
  ts: number;
  dateLabel: string;
  brand: string;
  info: string;
  kind: WalletTxKind;
  amount: string;
  currency: string;
  status: WalletTxStatus;
  statusLabel: string;
};

const WALLET_TX_DAY_MS = 86400000;
const WALLET_TX_BASE_TS = 1774656000000; // ~Mar 28, 2026 — anchor for the Date Range presets.

const WALLET_TX_ROWS: readonly WalletTxRow[] = [
  { id: "tx-1", ts: WALLET_TX_BASE_TS, dateLabel: "Mar 28, 2026", brand: "Glow Theory", info: "Cashback confirmed", kind: "earn", amount: "+120.00", currency: "THB", status: "success", statusLabel: "Success" },
  { id: "tx-2", ts: WALLET_TX_BASE_TS - 2 * WALLET_TX_DAY_MS, dateLabel: "Mar 26, 2026", brand: "Withdraw to SCB ***1234", info: "Bank transfer", kind: "withdraw", amount: "-500.00", currency: "THB", status: "pending", statusLabel: "Pending" },
  { id: "tx-3", ts: WALLET_TX_BASE_TS - 4 * WALLET_TX_DAY_MS, dateLabel: "Mar 24, 2026", brand: "Grocery Galaxy", info: "Cashback confirmed", kind: "earn", amount: "+45.50", currency: "THB", status: "success", statusLabel: "Success" },
  { id: "tx-4", ts: WALLET_TX_BASE_TS - 8 * WALLET_TX_DAY_MS, dateLabel: "Mar 20, 2026", brand: "Orbit Airways", info: "Awaiting store confirmation", kind: "earn", amount: "+88.00", currency: "THB", status: "pending", statusLabel: "Pending" },
  { id: "tx-5", ts: WALLET_TX_BASE_TS - 14 * WALLET_TX_DAY_MS, dateLabel: "Mar 14, 2026", brand: "Withdraw to PromptPay", info: "Bank transfer", kind: "withdraw", amount: "-1,000.00", currency: "THB", status: "success", statusLabel: "Success" },
  { id: "tx-6", ts: WALLET_TX_BASE_TS - 20 * WALLET_TX_DAY_MS, dateLabel: "Mar 8, 2026", brand: "Pocket Pantry", info: "Order cancelled", kind: "earn", amount: "+30.00", currency: "THB", status: "failed", statusLabel: "Failed" },
  { id: "tx-7", ts: WALLET_TX_BASE_TS - 30 * WALLET_TX_DAY_MS, dateLabel: "Feb 26, 2026", brand: "Withdraw to SCB ***1234", info: "Rejected by bank", kind: "withdraw", amount: "-250.00", currency: "THB", status: "failed", statusLabel: "Failed" },
  { id: "tx-8", ts: WALLET_TX_BASE_TS - 44 * WALLET_TX_DAY_MS, dateLabel: "Feb 12, 2026", brand: "Bloom & Beam", info: "Cashback confirmed", kind: "earn", amount: "+210.00", currency: "THB", status: "success", statusLabel: "Success" },
  { id: "tx-9", ts: WALLET_TX_BASE_TS - 59 * WALLET_TX_DAY_MS, dateLabel: "Jan 28, 2026", brand: "Quick Cart", info: "Awaiting store confirmation", kind: "earn", amount: "+15.00", currency: "THB", status: "pending", statusLabel: "Pending" },
] as const;

const WALLET_TX_MAX_TS = Math.max(...WALLET_TX_ROWS.map((row) => row.ts));
function WalletTransactions({ onRefresh }: { onRefresh: () => void }) {
  const styles = useThemedStyles(createWalletScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WalletTxStatus>("all");
  const [dateDays, setDateDays] = useState<number>(0);
  const [openFilter, setOpenFilter] = useState<"date" | "status" | null>(null);

  // Tab → kind, plus the Search / Status / Date Range filters (web parity: substring + status + day window).
  const rows = WALLET_TX_ROWS.filter((row) => {
    if (activeTab === 1 && row.kind !== "earn") return false;
    if (activeTab === 2 && row.kind !== "withdraw") return false;
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (dateDays > 0 && row.ts < WALLET_TX_MAX_TS - dateDays * WALLET_TX_DAY_MS) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const blob = `${row.brand} ${row.info} ${row.statusLabel} ${row.amount} ${row.currency}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  // Status + Date Range are tap-to-open dropdowns (web parity: a real <Select>). The pill
  // shows the current choice; tapping opens a menu of options to pick from.
  const statusOptions: { label: string; value: "all" | WalletTxStatus }[] = [
    { label: tc("All statuses"), value: "all" },
    { label: tc("Success"), value: "success" },
    { label: tc("Pending"), value: "pending" },
    { label: tc("Failed"), value: "failed" },
  ];
  const dateOptions: { label: string; value: number }[] = [
    { label: tc("All time"), value: 0 },
    { label: tc("Last 7 days"), value: 7 },
    { label: tc("Last 30 days"), value: 30 },
  ];
  const statusPillLabel =
    statusFilter === "all"
      ? tc("Status")
      : statusFilter === "success"
        ? tc("Success")
        : statusFilter === "pending"
          ? tc("Pending")
          : tc("Failed");
  const datePillLabel =
    dateDays === 0 ? tc("Date Range") : dateDays === 7 ? tc("Last 7 days") : tc("Last 30 days");

  return (
    <View style={styles.transactionArea}>
      <View accessibilityRole="tablist" style={styles.tabStrip}>
        {webWalletTransactionTabs.map((tab, index) => {
          const selected = index === activeTab;
          return (
            <MotionPressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              hoverLift={false}
              key={tab}
              onPress={() => setActiveTab(index)}
              pressScale={0.98}
              style={[styles.tabButton, selected ? styles.tabButtonActive : null]}
            >
              <Text
                numberOfLines={1}
                style={[styles.tabButtonText, selected ? styles.tabButtonTextActive : null]}
              >
                {tc(tab)}
              </Text>
            </MotionPressable>
          );
        })}
      </View>
      <View style={styles.filterRow}>
        <View style={styles.searchPill}>
          <SearchIcon color={colors.muted} size={18} strokeWidth={typography.iconStrokeWidth} />
          <TextInput
            onChangeText={setSearch}
            placeholder={tc("Search")}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={search}
          />
        </View>
        <FilterPill icon="calendar" label={datePillLabel} onPress={() => setOpenFilter("date")} />
        <FilterPill icon="status" label={statusPillLabel} onPress={() => setOpenFilter("status")} />
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
        {rows.length === 0 ? (
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
        ) : (
          <View style={styles.txList}>
            {rows.map((row) => (
              <View key={row.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text numberOfLines={1} style={styles.txBrand}>
                    {row.brand}
                  </Text>
                  <Text numberOfLines={1} style={styles.txMeta}>
                    {`${row.dateLabel} · ${row.kind === "earn" ? tc("Earn") : tc("Withdraw")}`}
                  </Text>
                  {row.info ? (
                    <Text numberOfLines={1} style={styles.txInfo}>
                      {tc(row.info)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      row.kind === "earn" ? styles.txAmountEarn : styles.txAmountWithdraw,
                    ]}
                  >
                    {`${row.amount} ${row.currency}`}
                  </Text>
                  <View style={[styles.txStatusPill, walletStatusPillStyle(row.status, styles)]}>
                    <Text style={[styles.txStatusText, walletStatusTextStyle(row.status, styles)]}>
                      {tc(row.statusLabel)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={() => setOpenFilter(null)}
        transparent
        visible={openFilter !== null}
      >
        <View style={styles.dropdownRoot}>
          <MotionPressable
            accessibilityLabel={tc("Close")}
            hoverLift={false}
            onPress={() => setOpenFilter(null)}
            pressScale={1}
            style={styles.dropdownBackdrop}
          />
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownTitle}>
              {openFilter === "status" ? tc("Status") : tc("Date Range")}
            </Text>
            {openFilter === "status"
              ? statusOptions.map((opt) => (
                  <WalletFilterOption
                    key={opt.value}
                    label={opt.label}
                    onSelect={() => {
                      setStatusFilter(opt.value);
                      setOpenFilter(null);
                    }}
                    selected={statusFilter === opt.value}
                  />
                ))
              : dateOptions.map((opt) => (
                  <WalletFilterOption
                    key={opt.value}
                    label={opt.label}
                    onSelect={() => {
                      setDateDays(opt.value);
                      setOpenFilter(null);
                    }}
                    selected={dateDays === opt.value}
                  />
                ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function WalletFilterOption({
  label,
  onSelect,
  selected,
}: {
  label: string;
  onSelect: () => void;
  selected: boolean;
}) {
  const styles = useThemedStyles(createWalletScreenStyles);
  const { colors } = useTheme();
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hoverLift={false}
      onPress={onSelect}
      pressScale={0.98}
      style={styles.dropdownOption}
    >
      <Text style={[styles.dropdownOptionText, selected ? styles.dropdownOptionTextSelected : null]}>
        {label}
      </Text>
      {selected ? (
        <CheckIcon color={colors.primaryDark} size={18} strokeWidth={typography.iconStrokeWidth} />
      ) : null}
    </MotionPressable>
  );
}

function walletStatusPillStyle(status: WalletTxStatus, styles: ReturnType<typeof createWalletScreenStyles>) {
  return status === "success"
    ? styles.txStatusPillSuccess
    : status === "pending"
      ? styles.txStatusPillPending
      : styles.txStatusPillFailed;
}

function walletStatusTextStyle(status: WalletTxStatus, styles: ReturnType<typeof createWalletScreenStyles>) {
  return status === "success"
    ? styles.txStatusTextSuccess
    : status === "pending"
      ? styles.txStatusTextPending
      : styles.txStatusTextFailed;
}

function WalletHeader() {
  const styles = useThemedStyles(createWalletScreenStyles);
  const { colors } = useTheme();
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
  const styles = useThemedStyles(createWalletScreenStyles);
  const { colors } = useTheme();
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

function WalletCashbackSummary({ liveMetrics }: { liveMetrics: WalletMetricView[] | null }) {
  const styles = useThemedStyles(createWalletScreenStyles);
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
        {(liveMetrics ?? webWalletCashbackSummary.metrics).map((metric) => (
          <WalletMetricCard key={metric.label} metric={metric} />
        ))}
      </View>
    </View>
  );
}

function WalletMetricCard({ metric }: { metric: WalletMetric }) {
  const styles = useThemedStyles(createWalletScreenStyles);
  const { colors } = useTheme();
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

function FilterPill({
  icon,
  label,
  onPress,
}: {
  icon: "calendar" | "search" | "status";
  label: string;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(createWalletScreenStyles);
  const { colors } = useTheme();
  const Icon =
    icon === "search" ? SearchIcon : icon === "calendar" ? CalendarIcon : ChevronDownIcon;

  return (
    <MotionPressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      pressScale={0.98}
      style={styles.filterPill}
    >
      <Icon color={colors.muted} size={18} strokeWidth={typography.iconStrokeWidth} />
      <Text numberOfLines={1} style={styles.filterText}>
        {label}
      </Text>
    </MotionPressable>
  );
}

function createWalletScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
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
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: "0 4px 14px rgba(16, 53, 34, 0.06)",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
  },
  lineBadge: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#D5F4EF", colors.primarySoft),
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
    color: pickThemed(colors, "#1B3854", colors.ink),
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
  },
  supportContactSubtitle: {
    color: pickThemed(colors, "#6E88A5", colors.muted),
    fontFamily: typography.family,
    fontSize: typography.body,
  },
  cashbackSummaryCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
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
    color: pickThemed(colors, "#314761", colors.ink),
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "800",
  },
  cashbackSubtitle: {
    color: pickThemed(colors, "#7289A0", colors.muted),
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 24,
  },
  walletMetricStack: {
    gap: spacing.md,
  },
  metricCard: {
    backgroundColor: colors.fieldMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  metricCardPrimary: {
    backgroundColor: pickThemed(colors, "#E4F8F9", colors.primarySoft),
    borderColor: "rgba(0, 204, 153, 0.25)",
  },
  metricTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  metricIcon: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#EEF9FA", colors.card),
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
    color: pickThemed(colors, "#1B3854", colors.ink),
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
  },
  metricHint: {
    color: pickThemed(colors, "#7289A0", colors.muted),
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
    alignItems: "center",
    backgroundColor: colors.fieldMuted,
    borderBottomColor: "transparent",
    borderBottomWidth: 2,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    outlineColor: "transparent",
    outlineWidth: 0,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  tabButtonActive: {
    backgroundColor: colors.card,
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "600",
    textAlign: "center",
  },
  tabButtonTextActive: {
    color: colors.primaryDark,
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
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: spacing.md,
  },
  searchPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexBasis: 170,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.caption,
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingVertical: 0,
  },
  filterText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  dropdownRoot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  dropdownBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    bottom: 0,
    left: 0,
    outlineColor: "transparent",
    outlineWidth: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  dropdownMenu: {
    backgroundColor: colors.card,
    borderRadius: 16,
    boxShadow: shadows.cardCss,
    maxWidth: 340,
    padding: 8,
    width: "100%",
  },
  dropdownTitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownOption: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: 12,
  },
  dropdownOptionText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
  },
  dropdownOptionTextSelected: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  txList: {
    backgroundColor: colors.card,
    width: "100%",
  },
  txRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  txLeft: {
    flex: 1,
    gap: 3,
  },
  txBrand: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "600",
  },
  txMeta: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  txInfo: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  txRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  txAmount: {
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  txAmountEarn: {
    color: "#00B14F",
  },
  txAmountWithdraw: {
    color: pickThemed(colors, "#C0392B", colors.danger),
  },
  txStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  txStatusText: {
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "600",
  },
  txStatusPillSuccess: {
    backgroundColor: pickThemed(colors, "#E6F7ED", colors.primarySoft),
  },
  txStatusTextSuccess: {
    color: "#00B14F",
  },
  txStatusPillPending: {
    backgroundColor: pickThemed(colors, "#FFF4E5", colors.warningSoft),
  },
  txStatusTextPending: {
    color: pickThemed(colors, "#B26A00", "#E8B057"),
  },
  txStatusPillFailed: {
    backgroundColor: pickThemed(colors, "#FDECEC", "rgba(248, 113, 113, 0.16)"),
  },
  txStatusTextFailed: {
    color: pickThemed(colors, "#C0392B", colors.danger),
  },
  tableShell: {
    backgroundColor: colors.fieldMuted,
    borderColor: colors.border,
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
}
