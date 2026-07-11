import { Link } from "expo-router";
import {
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  Copy as ContentCopyIcon,
} from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { mapReferralPointsToInviteRows, type ReferralInviteRow } from "@mobile/api/referralMapper";
import { isReferralPointList } from "@mobile/api/referralTypes";
import {
  isReferralResourceBlocking,
  resolveReferralInviteLink,
} from "@mobile/auth/referralInviteUrl";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { copyToClipboard } from "@mobile/lib/clipboard";
import { haptics } from "@mobile/lib/haptics";
import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import {
  FacebookBrandIcon,
  InstagramBrandIcon,
  LinkedInBrandIcon,
  XBrandIcon,
} from "@mobile/components/SocialBrandIcons";
import { WalletSkeleton } from "@mobile/components/Skeleton";
import { useToast } from "@mobile/hooks/useToast";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  mobileShellLayout,
  webAccountPageSurface,
  webReferralPage,
} from "@mobile/design/webDesignParity";
import { ExploreOtherShopsSection } from "@mobile/screens/ExploreOtherShopsSection";
import { getMobileEnv } from "@mobile/config/env";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";
import referralGiftImage from "../../assets/referral-gift.png";
import helpBubbleIconImage from "../../assets/referral-help-bubble-icon.png";
// referral-step-banner.png is no longer used — the steps render as numbered cards.

type SocialLink = (typeof webReferralPage.earn.socialLinks)[number];
type SocialLinkId = SocialLink["id"];
type FaqItem = (typeof webReferralPage.faq.items)[number];

function resolveReferralSocialIconColor(link: SocialLink, colors: ThemeColors): string {
  if (link.id === "x") {
    return pickThemed(colors, link.color, colors.white);
  }
  return link.color;
}

export function CustomerReferralScreen() {
  const styles = useThemedStyles(createReferralScreenStyles);
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  // Mirror the shell math the shared explore grid expects: capped shell width
  // minus this screen's own content padding (16 mobile / 24 desktop).
  const shellWidth = Math.min(
    width,
    isDesktop ? webAccountPageSurface.desktopContentMaxWidth : mobileShellLayout.contentMaxWidth
  );
  const contentWidth = shellWidth - (isDesktop ? 24 : spacing.md) * 2;
  const session = useMobileSessionSnapshot();
  const mobileEnv = getMobileEnv();
  const inviteLink = resolveReferralInviteLink({
    frontendUrl: mobileEnv.frontendUrl,
    userId: typeof session?._id === "string" ? session._id : null,
    useFixtures: mobileEnv.accountDataSource === "fixtures",
  });
  const referralResource = useCustomerAccountResource({
    fixtureData: webReferralPage,
    resourceId: "referral",
  });
  const copyReferralLink = useCopyReferralLink(inviteLink.inviteUrl);
  // Live referral activity replaces the demo rows when the backend list
  // narrows; fixtures mode keeps the screen-local rows byte-identically.
  const liveInviteRows: ReferralInviteRow[] | null =
    referralResource.status === "empty"
      ? []
      : referralResource.status === "ready" && isReferralPointList(referralResource.data)
        ? mapReferralPointsToInviteRows(referralResource.data)
        : null;

  if (isReferralResourceBlocking(referralResource.status)) {
    return (
      <CustomerAccountResourceState
        loadingSkeleton={<WalletSkeleton />}
        resource={referralResource}
        resourceLabel="referral activity"
      />
    );
  }

  return (
    <ReferralSubPage>
      <View style={styles.referralShell}>
        {isDesktop ? null : <ReferralTopBar />}
        <ScrollView
          contentContainerStyle={[styles.content, isDesktop ? styles.referralContentDesktop : null]}
          refreshControl={
            <RefreshControl
              onRefresh={referralResource.retry}
              refreshing={false}
              title={tc("Loading referral activity…")}
            />
          }
        >
          <ReferralEarnCard
            displayLink={inviteLink.displayLink}
            inviteUrl={inviteLink.inviteUrl}
            isDesktop={isDesktop}
            onCopyLink={copyReferralLink}
            referralCode={inviteLink.referralCode}
          />
          <ReferralInvitationPanel liveRows={liveInviteRows} />
          <ReferralStepsSection />
          <ReferralFaqsSection />
          <ExploreOtherShopsSection contentWidth={contentWidth} />
        </ScrollView>
      </View>
    </ReferralSubPage>
  );
}

// Copy the referral link, then confirm with a transient toast + success haptic.
// Reuses the existing translated "Copied to clipboard" string (tc reverse-looks it
// up to the walletTransactionsCopied catalog key → Thai "คัดลอกแล้ว"), so no new copy
// is added. Returns a stable callback shared by the copy button and the Instagram
// social action (which copies the link rather than opening a share sheet).
function useCopyReferralLink(inviteUrl: string): () => void {
  const tc = useCopy();
  const toast = useToast();
  return () => {
    void copyToClipboard(inviteUrl).then((copied) => {
      if (!copied) {
        return;
      }
      toast.show(tc("Copied to clipboard"));
      void haptics.success();
    });
  };
}

function ReferralSubPage({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createReferralScreenStyles);
  const tc = useCopy();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(webReferralPage.title)}>
      <View style={[styles.surface, styles.referralSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function ReferralTopBar() {
  const styles = useThemedStyles(createReferralScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={28} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{tc(webReferralPage.title)}</Text>
      </Pressable>
    </Link>
  );
}

function ReferralEarnCard({
  displayLink,
  inviteUrl,
  isDesktop,
  onCopyLink,
  referralCode,
}: {
  displayLink: string;
  inviteUrl: string;
  isDesktop: boolean;
  onCopyLink: () => void;
  referralCode: string;
}) {
  const styles = useThemedStyles(createReferralScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <View style={[styles.earnCard, isDesktop ? styles.earnCardDesktop : null]}>
      <Image
        alt=""
        resizeMode="contain"
        source={referralGiftImage}
        style={[styles.giftArt, isDesktop ? styles.giftArtDesktop : null]}
      />
      <View style={styles.earnContent}>
        <View style={styles.earnHeader}>
          <Text numberOfLines={2} style={styles.earnTitle}>
            {tc(webReferralPage.earn.title)}
          </Text>
          <Text numberOfLines={2} style={styles.earnSubtitle}>
            {tc(webReferralPage.earn.subtitle)}
          </Text>
          <View style={styles.rewardPill}>
            <Text style={styles.rewardPillEmoji}>🎁</Text>
            <Text numberOfLines={1} style={styles.rewardPillText}>
              {tc("Earn ฿20 for every friend who joins")}
            </Text>
          </View>
        </View>
        <View style={styles.copySection}>
          <Text numberOfLines={2} style={styles.shareTitle}>
            {tc(webReferralPage.earn.shareTitle)}
          </Text>
          <MotionPressable
            accessibilityLabel={tc("Copy referral link")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleCopy}
            pressScale={0.99}
            style={styles.copyButton}
          >
            <View style={styles.copyLabelRow}>
              <Text numberOfLines={1} style={styles.copyLink}>
                {copied
                  ? tc("Copied!")
                  : `${tc(webReferralPage.earn.inviteLinkLabel)} : ${displayLink}`}
              </Text>
              {copied ? (
                <CheckIcon color={colors.white} size={24} strokeWidth={typography.iconStrokeWidth} />
              ) : (
                <ContentCopyIcon
                  color={colors.white}
                  size={24}
                  strokeWidth={typography.iconStrokeWidth}
                />
              )}
            </View>
          </MotionPressable>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>{tc("Referral code")}</Text>
            <MotionPressable
              accessibilityLabel={tc("Copy referral code")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleCopy}
              pressScale={0.97}
              style={styles.codeChip}
            >
              <Text numberOfLines={1} style={styles.codeChipText}>
                {referralCode}
              </Text>
              <ContentCopyIcon
                color={colors.primaryDark}
                size={16}
                strokeWidth={typography.iconStrokeWidth}
              />
            </MotionPressable>
          </View>
        </View>
        <View style={styles.socialSection}>
          <Text numberOfLines={2} style={styles.socialTitle}>
            {tc(webReferralPage.earn.socialTitle)}
          </Text>
          <View accessibilityRole="list" style={styles.socialRow}>
            {webReferralPage.earn.socialLinks.map((link) => (
              <SocialIconButton
                key={link.id}
                inviteUrl={inviteUrl}
                link={link}
                onCopyLink={onCopyLink}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function shareUrlEncoded(url: string): string {
  return encodeURIComponent(url);
}

function openReferralShare(kind: Exclude<SocialLinkId, "instagram">, inviteUrl: string) {
  const encodedUrl = shareUrlEncoded(inviteUrl);
  const urls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}`,
  } as const;
  const url = urls[kind];

  if (typeof window !== "undefined" && typeof window.open === "function") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  void Linking.openURL(url);
}

function handleSocialPress(id: SocialLinkId, inviteUrl: string, onCopyLink: () => void) {
  if (id === "instagram") {
    onCopyLink();
    return;
  }

  openReferralShare(id, inviteUrl);
}

function SocialIconButton({
  inviteUrl,
  link,
  onCopyLink,
}: {
  inviteUrl: string;
  link: SocialLink;
  onCopyLink: () => void;
}) {
  const styles = useThemedStyles(createReferralScreenStyles);
  const { colors } = useTheme();
  const iconColor = resolveReferralSocialIconColor(link, colors);
  return (
    <MotionPressable
      accessibilityLabel={link.label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => handleSocialPress(link.id, inviteUrl, onCopyLink)}
      pressScale={0.92}
      style={styles.socialButton}
    >
      {link.id === "facebook" ? <FacebookBrandIcon color={iconColor} size={24} /> : null}
      {link.id === "linkedin" ? <LinkedInBrandIcon color={iconColor} size={24} /> : null}
      {link.id === "instagram" ? <InstagramBrandIcon color={iconColor} size={24} /> : null}
      {link.id === "x" ? <XBrandIcon color={iconColor} size={24} /> : null}
    </MotionPressable>
  );
}

// Local categorized invite rows so the tabs can FILTER like the web (All / Created Account / Shopped
// with Us). The shared webReferralPage fixture ships a single uncategorized row and is owned by parallel
// work, so the demo rows live here. Tab index → row category (null = show all rows).
const REFERRAL_TAB_CATEGORIES = [null, "account", "shop"] as const;

const REFERRAL_INVITE_ROWS = [
  { date: "3/28/2026", user: "FriendInvite", point: "120 pts", status: "Success", category: "account" },
  { date: "3/24/2026", user: "NeighborJoin", point: "120 pts", status: "Success", category: "account" },
  { date: "3/19/2026", user: "ShopBuddy", point: "80 pts", status: "Success", category: "shop" },
  { date: "3/12/2026", user: "DealMate", point: "80 pts", status: "Success", category: "shop" },
] as const;

function ReferralInvitationPanel({ liveRows }: { liveRows: ReferralInviteRow[] | null }) {
  const styles = useThemedStyles(createReferralScreenStyles);
  const tc = useCopy();
  const [activeTab, setActiveTab] = useState(0);
  return (
    <View style={styles.invitationSection}>
      <Text style={styles.invitationTitle}>{tc(webReferralPage.invitation.title)}</Text>
      <ReferralInvitationTabs activeTab={activeTab} onSelectTab={setActiveTab} />
      <ReferralInvitationTable activeTab={activeTab} liveRows={liveRows} />
    </View>
  );
}

function ReferralInvitationTabs({
  activeTab,
  onSelectTab,
}: {
  activeTab: number;
  onSelectTab: (index: number) => void;
}) {
  const styles = useThemedStyles(createReferralScreenStyles);
  const tc = useCopy();
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {webReferralPage.invitation.tabs.map((tab, index) => {
        const selected = index === activeTab;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab}
            onPress={() => onSelectTab(index)}
            style={[styles.tabButton, selected ? styles.tabButtonActive : styles.tabButtonInactive]}
          >
            <Text
              numberOfLines={2}
              style={[styles.tabText, selected ? styles.tabTextActive : styles.tabTextInactive]}
            >
              {tc(tab)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ReferralInvitationTable({
  activeTab,
  liveRows,
}: {
  activeTab: number;
  liveRows: ReferralInviteRow[] | null;
}) {
  const styles = useThemedStyles(createReferralScreenStyles);
  const tc = useCopy();
  const category = REFERRAL_TAB_CATEGORIES[activeTab] ?? null;
  const sourceRows: readonly ReferralInviteRow[] = liveRows ?? REFERRAL_INVITE_ROWS;
  const rows = category
    ? sourceRows.filter((row) => row.category === category)
    : sourceRows;
  const showEmptyInvites = liveRows !== null && rows.length === 0;
  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        {webReferralPage.invitation.columns.map((column) => (
          <Text key={column} style={styles.tableHeaderText}>
            {tc(column)}
          </Text>
        ))}
      </View>
      {showEmptyInvites ? (
        <View style={styles.tableEmptyState}>
          <Text style={styles.tableEmptyTitle}>{tc("It's been a while since your last invite.")}</Text>
          <Text style={styles.tableEmptySubtitle}>{tc("Share with friends and earn rewards together!")}</Text>
        </View>
      ) : (
        rows.map((row) => (
          <View key={`${row.date}-${row.user}`} style={styles.tableRow}>
            <Text style={styles.tableCell}>{row.date}</Text>
            <Text style={styles.tableCell}>{row.user}</Text>
            <Text style={styles.tableCell}>{row.point}</Text>
            <View style={styles.tableCell}>
              <View style={styles.invitationStatusPill}>
                <Text style={styles.invitationStatusPillText}>{tc(row.status)}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// Premium "how it works": the 3 fixture steps as numbered cards (was a single flat banner image),
// so the copy → share → earn flow is scannable at a glance.
function ReferralStepsSection() {
  const styles = useThemedStyles(createReferralScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.stepsSection}>
      <Text style={styles.stepsKicker}>{tc(webReferralPage.steps.kicker)}</Text>
      <Text style={styles.stepsTitle}>{tc(webReferralPage.steps.title)}</Text>
      <View style={styles.stepsList}>
        {webReferralPage.steps.bullets.map((bullet, index) => (
          <View key={bullet} style={styles.stepCard}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepCardText}>{tc(bullet)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReferralFaqsSection() {
  const styles = useThemedStyles(createReferralScreenStyles);
  const tc = useCopy();
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(0);

  return (
    <View style={styles.faqSection}>
      <Text style={styles.faqTitle}>{tc(webReferralPage.faq.title)}</Text>
      <View style={styles.faqStack}>
        {webReferralPage.faq.items.map((item, index) => (
          <ReferralFaqItem
            expanded={expandedFaqIndex === index}
            item={item}
            key={item.question}
            onPress={() => setExpandedFaqIndex(expandedFaqIndex === index ? -1 : index)}
          />
        ))}
      </View>
    </View>
  );
}

function ReferralFaqItem({
  expanded,
  item,
  onPress,
}: {
  expanded: boolean;
  item: FaqItem;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createReferralScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.faqCard}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.faqQuestionRow}>
        <View style={styles.faqQuestionCopy}>
          <Image alt="" source={helpBubbleIconImage} style={styles.helpBubbleIcon} />
          <Text style={styles.faqQuestion}>{tc(item.question)}</Text>
        </View>
        <ChevronDownIcon
          color={colors.ink}
          size={20}
          strokeWidth={typography.iconStrokeWidth}
          style={expanded ? styles.faqChevronExpanded : null}
        />
      </Pressable>
      {expanded ? <Text style={styles.faqAnswer}>{tc(item.answer)}</Text> : null}
    </View>
  );
}


function createReferralScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    overflow: "hidden",
    width: "100%",
  },
  referralSurfaceBleed: {
    marginHorizontal: -8,
    marginTop: 18,
  },
  referralShell: {
    backgroundColor: "transparent",
    minHeight: 1040,
    width: "100%",
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 66,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  topBarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  content: {
    gap: 26,
    paddingBottom: 118,
    paddingHorizontal: spacing.md,
    paddingTop: 24,
  },
  referralContentDesktop: {
    gap: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  earnCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: "0 8px 28px rgba(16, 53, 34, 0.08)",
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  earnCardDesktop: {
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  giftArt: {
    height: 270,
    opacity: 0.24,
    position: "absolute",
    right: -52,
    top: 98,
    width: 204,
  },
  giftArtDesktop: {
    height: 360,
    opacity: 0.26,
    right: 0,
    top: 88,
    width: 276,
  },
  earnContent: {
    gap: 28,
  },
  earnHeader: {
    gap: 10,
  },
  earnTitle: {
    color: pickThemed(colors, "#103522", colors.accent),
    fontFamily: typography.family,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  earnSubtitle: {
    color: colors.accentSoft,
    fontFamily: typography.family,
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 28,
  },
  copySection: {
    gap: 14,
  },
  shareTitle: {
    color: pickThemed(colors, "#103522", colors.accent),
    fontFamily: typography.family,
    fontSize: 21,
    fontWeight: "400",
    lineHeight: 27,
  },
  copyButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    gap: 12,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  copyLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  copyLabel: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  copyLink: {
    color: colors.white,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    lineHeight: 22,
  },
  codeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  codeLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "400",
  },
  codeChip: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#E6F7ED", colors.primarySoft),
    borderColor: pickThemed(colors, "rgba(0, 170, 128, 0.28)", colors.border),
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  codeChipText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  socialSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 18,
    paddingTop: 24,
  },
  socialTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 23,
  },
  socialRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingLeft: 0,
  },
  socialButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: "0 2px 8px rgba(16, 53, 34, 0.08)",
    height: 48,
    justifyContent: "center",
    // Web parity: suppress the browser focus-visible ring (the orange default).
    outlineColor: "transparent",
    outlineWidth: 0,
    width: 48,
  },
  invitationSection: {
    gap: 22,
  },
  invitationTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  tabs: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
  },
  tabButton: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 3,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
    // Web parity: suppress the browser focus-visible ring (the orange default) — the established
    // Expo pattern; the selected white bg + green underline is the indicator.
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.card,
    borderBottomColor: colors.primary,
  },
  tabButtonInactive: {
    backgroundColor: colors.fieldMuted,
  },
  tabText: {
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    lineHeight: 19,
    textAlign: "center",
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabTextInactive: {
    color: colors.muted,
  },
  tableCard: {
    backgroundColor: pickThemed(colors, "rgba(255,255,255,0.36)", colors.card),
    borderColor: pickThemed(colors, "#B8D4EF", colors.border),
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: colors.fieldMuted,
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  tableHeaderText: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
  tableRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  tableCell: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 18,
    lineHeight: 25,
  },
  tableCellRight: {
    textAlign: "right",
  },
  tableEmptyState: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  tableEmptyTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.titleWeight,
    lineHeight: typography.bodyLineHeight,
    textAlign: "center",
  },
  tableEmptySubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.label,
    lineHeight: typography.labelLineHeight,
    textAlign: "center",
  },
  invitationStatusPill: {
    alignSelf: "flex-start",
    backgroundColor: pickThemed(colors, "#E6F7ED", colors.primarySoft),
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  invitationStatusPillText: {
    color: pickThemed(colors, "#00B14F", colors.primary),
    fontFamily: typography.family,
    fontSize: typography.label,
    fontWeight: typography.labelWeight,
    lineHeight: typography.labelLineHeight,
  },
  rewardPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: pickThemed(colors, "#E6F7ED", colors.primarySoft),
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rewardPillEmoji: {
    fontSize: 15,
  },
  rewardPillText: {
    color: pickThemed(colors, "#00875A", colors.accentSoft),
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "400",
  },
  stepsSection: {
    gap: 14,
  },
  stepsKicker: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  stepsTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 29,
  },
  stepsList: {
    gap: 12,
  },
  stepCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 4px 16px rgba(16, 53, 34, 0.06)",
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stepNumberBadge: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#E6F7ED", colors.primarySoft),
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  stepNumberText: {
    color: pickThemed(colors, "#00875A", colors.accentSoft),
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "800",
  },
  stepCardText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 15,
    lineHeight: 22,
  },
  faqSection: {
    gap: 16,
  },
  faqTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 31,
  },
  faqStack: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  faqQuestionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  faqQuestionCopy: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  helpBubbleIcon: {
    height: 21,
    width: 21,
  },
  faqQuestion: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  faqChevronExpanded: {
    transform: [{ rotate: "180deg" }],
  },
  faqAnswer: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 21,
    paddingBottom: 16,
    paddingLeft: 45,
    paddingRight: 16,
  },
});
}

