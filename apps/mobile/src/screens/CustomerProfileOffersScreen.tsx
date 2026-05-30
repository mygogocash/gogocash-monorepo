import { Link } from "expo-router";
import { ChevronLeft as ChevronLeftIcon, Copy as CopyIcon } from "@mobile/theme/icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

const myOfferRows = [
  {
    createdAt: "28 Mar 2026",
    deeplink: "https://gogoca.sh/offer/agoda-summer",
    id: "row-1",
    offer_id: "OFFER-1024",
    offer_name: "Agoda Summer Cashback",
  },
  {
    createdAt: "22 Mar 2026",
    deeplink: "https://gogoca.sh/offer/shopee-daily",
    id: "row-2",
    offer_id: "OFFER-1008",
    offer_name: "Shopee Daily Deal",
  },
] as const;

export function CustomerProfileOffersScreen() {
  const offersResource = useCustomerAccountResource({
    fixtureData: myOfferRows,
    resourceId: "offers",
  });

  if (offersResource.status !== "ready") {
    return (
      <CustomerAccountResourceState
        emptyBody="Activate cashback offers to see your personal offer links here."
        emptyTitle="No activated offers yet"
        resource={offersResource}
        resourceLabel="offers"
      />
    );
  }

  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title="My Offer">
      <View style={styles.surface}>
        <Link asChild href="/profile">
          <Pressable accessibilityRole="link" style={styles.topBar}>
            <ChevronLeftIcon
              color={colors.accent}
              size={26}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text style={styles.topBarTitle}>My Offer</Text>
          </Pressable>
        </Link>

        <View style={styles.content}>
          <Text style={styles.title}>My Offer</Text>
          <Text style={styles.body}>
            Activated cashback offers from your GoGoCash account, including each deeplink and
            created date.
          </Text>
          <View accessibilityRole="list" style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, styles.offerIdCell]}>offer_id</Text>
              <Text style={[styles.headerCell, styles.offerNameCell]}>offer_name</Text>
              <Text style={[styles.headerCell, styles.createdCell]}>createdAt</Text>
            </View>
            {myOfferRows.map((row) => (
              <View key={row.id} style={styles.offerRow}>
                <View style={styles.rowTop}>
                  <Text style={styles.offerId}>{row.offer_id}</Text>
                  <Text numberOfLines={2} style={styles.offerName}>
                    {row.offer_name}
                  </Text>
                </View>
                <Text style={styles.createdAt}>{row.createdAt}</Text>
                <View style={styles.deeplinkRow}>
                  <Text numberOfLines={1} style={styles.deeplink}>
                    {row.deeplink}
                  </Text>
                  <MotionPressable
                    accessibilityLabel="Copy Link"
                    accessibilityRole="button"
                    onPress={() => copyOfferLink(row.deeplink)}
                    pressScale={0.94}
                    style={styles.copyButton}
                  >
                    <CopyIcon
                      color={colors.primaryDark}
                      size={18}
                      strokeWidth={typography.iconStrokeWidth}
                    />
                  </MotionPressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </AccountPageShell>
  );
}

function copyOfferLink(deeplink: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(deeplink).catch(() => undefined);
  }
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    marginHorizontal: -8,
    marginTop: 18,
    overflow: "hidden",
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 66,
    paddingHorizontal: spacing.md,
  },
  topBarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "700",
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 26,
    fontWeight: "700",
  },
  body: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 23,
  },
  table: {
    backgroundColor: "#F9FAFB",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerRow: {
    backgroundColor: "#F6F6F6",
    flexDirection: "row",
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  headerCell: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
    paddingVertical: spacing.md,
  },
  offerIdCell: {
    width: 92,
  },
  offerNameCell: {
    flex: 1,
  },
  createdCell: {
    textAlign: "right",
    width: 96,
  },
  offerRow: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowTop: {
    flexDirection: "row",
    gap: spacing.md,
  },
  offerId: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
    width: 92,
  },
  offerName: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
  createdAt: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  deeplinkRow: {
    alignItems: "center",
    backgroundColor: "#F3FBF8",
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  deeplink: {
    color: colors.accent,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  copyButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
});
