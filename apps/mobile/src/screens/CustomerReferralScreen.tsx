import { Link } from "expo-router";
import {
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
import { copyToClipboard } from "@mobile/lib/clipboard";
import { haptics } from "@mobile/lib/haptics";
import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { WalletSkeleton } from "@mobile/components/Skeleton";
import { useToast } from "@mobile/hooks/useToast";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout, profileInviteUrl, webReferralPage } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";
import referralGiftImage from "../../assets/referral-gift.png";
import helpBubbleIconImage from "../../assets/referral-help-bubble-icon.png";
import referralHeroBannerImage from "../../assets/referral-hero-banner.png";
import referralStepBannerImage from "../../assets/referral-step-banner.png";

type SocialLink = (typeof webReferralPage.earn.socialLinks)[number];
type SocialLinkId = SocialLink["id"];
type FaqItem = (typeof webReferralPage.faq.items)[number];

export function CustomerReferralScreen() {
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const referralResource = useCustomerAccountResource({
    fixtureData: webReferralPage,
    resourceId: "referral",
  });
  const copyReferralLink = useCopyReferralLink();

  if (referralResource.status !== "ready") {
    return (
      <CustomerAccountResourceState
        emptyBody={tc("Invite friends to start building referral activity.")}
        emptyTitle={tc("No referral activity yet")}
        loadingSkeleton={<WalletSkeleton />}
        resource={referralResource}
        resourceLabel="referral activity"
      />
    );
  }

  return (
    <ReferralSubPage>
      <View style={styles.referralBlueShell}>
        <ReferralTopBar />
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
          <ReferralHeroBanner isDesktop={isDesktop} />
          <ReferralEarnCard isDesktop={isDesktop} onCopyLink={copyReferralLink} />
          <ReferralInvitationPanel />
          <ReferralStepsSection />
          <ReferralFaqsSection />
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
function useCopyReferralLink(): () => void {
  const tc = useCopy();
  const toast = useToast();
  return () => {
    void copyToClipboard(profileInviteUrl).then((copied) => {
      if (!copied) {
        return;
      }
      toast.show(tc("Copied to clipboard"));
      void haptics.success();
    });
  };
}

function ReferralSubPage({ children }: { children: ReactNode }) {
  const tc = useCopy();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(webReferralPage.title)}>
      <View style={[styles.surface, styles.referralSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function ReferralTopBar() {
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

function ReferralHeroBanner({ isDesktop }: { isDesktop: boolean }) {
  return (
    <Image
      accessibilityLabel={webReferralPage.hero.alt}
      alt={webReferralPage.hero.alt}
      resizeMode="contain"
      source={referralHeroBannerImage}
      style={[styles.heroBanner, isDesktop ? styles.heroBannerDesktop : null]}
    />
  );
}

function ReferralEarnCard({
  isDesktop,
  onCopyLink,
}: {
  isDesktop: boolean;
  onCopyLink: () => void;
}) {
  const tc = useCopy();
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
        </View>
        <View style={styles.copySection}>
          <Text numberOfLines={2} style={styles.shareTitle}>
            {tc(webReferralPage.earn.shareTitle)}
          </Text>
          <MotionPressable
            accessibilityLabel={tc("Copy referral link")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onCopyLink}
            pressScale={0.99}
            style={styles.copyButton}
          >
            <View style={styles.copyLabelRow}>
              <Text numberOfLines={1} style={styles.copyLabel}>
                {tc(webReferralPage.earn.inviteLinkLabel)} :
              </Text>
              <ContentCopyIcon color={colors.white} size={24} strokeWidth={typography.iconStrokeWidth} />
            </View>
            <Text numberOfLines={1} style={styles.copyLink}>
              {webReferralPage.earn.displayLink}
            </Text>
          </MotionPressable>
        </View>
        <View style={styles.socialSection}>
          <Text numberOfLines={2} style={styles.socialTitle}>
            {tc(webReferralPage.earn.socialTitle)}
          </Text>
          <View accessibilityRole="list" style={styles.socialRow}>
            {webReferralPage.earn.socialLinks.map((link) => (
              <SocialIconButton key={link.id} link={link} onCopyLink={onCopyLink} />
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

function openReferralShare(kind: Exclude<SocialLinkId, "instagram">) {
  const encodedUrl = shareUrlEncoded(profileInviteUrl);
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

function handleSocialPress(id: SocialLinkId, onCopyLink: () => void) {
  if (id === "instagram") {
    onCopyLink();
    return;
  }

  openReferralShare(id);
}

function SocialIconButton({ link, onCopyLink }: { link: SocialLink; onCopyLink: () => void }) {
  return (
    <MotionPressable
      accessibilityLabel={link.label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => handleSocialPress(link.id, onCopyLink)}
      pressScale={0.94}
      style={styles.socialButton}
    >
      {link.id === "facebook" ? <FacebookIcon color={link.color} /> : null}
      {link.id === "linkedin" ? <LinkedinIcon color={link.color} /> : null}
      {link.id === "instagram" ? <InstagramIcon color={link.color} /> : null}
      {link.id === "x" ? <XIcon color={link.color} /> : null}
    </MotionPressable>
  );
}

function FacebookIcon({ color }: { color: string }) {
  return <Text style={[styles.brandIcon, styles.facebookIcon, { color }]}>f</Text>;
}

function LinkedinIcon({ color }: { color: string }) {
  return <Text style={[styles.brandIcon, styles.linkedinIcon, { color }]}>in</Text>;
}

function InstagramIcon({ color }: { color: string }) {
  return <Text style={[styles.brandIcon, { color }]}>◎</Text>;
}

function XIcon({ color }: { color: string }) {
  return <Text style={[styles.brandIcon, styles.xIcon, { color }]}>X</Text>;
}

function ReferralInvitationPanel() {
  const tc = useCopy();
  return (
    <View style={styles.invitationSection}>
      <Text style={styles.invitationTitle}>{tc(webReferralPage.invitation.title)}</Text>
      <ReferralInvitationTabs />
      <ReferralInvitationTable />
    </View>
  );
}

function ReferralInvitationTabs() {
  const tc = useCopy();
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {webReferralPage.invitation.tabs.map((tab, index) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: index === 0 }}
          key={tab}
          style={[styles.tabButton, index === 0 ? styles.tabButtonActive : styles.tabButtonInactive]}
        >
          <Text
            numberOfLines={1}
            style={[styles.tabText, index === 0 ? styles.tabTextActive : styles.tabTextInactive]}
          >
            {tc(tab)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ReferralInvitationTable() {
  const tc = useCopy();
  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        {webReferralPage.invitation.columns.map((column) => (
          <Text key={column} style={styles.tableHeaderText}>
            {tc(column)}
          </Text>
        ))}
      </View>
      {webReferralPage.invitation.rows.map((row) => (
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
      ))}
    </View>
  );
}

function ReferralStepsSection() {
  return (
    <View style={styles.stepsBanner}>
      <Image
        accessibilityLabel={webReferralPage.steps.alt}
        alt={webReferralPage.steps.alt}
        resizeMode="contain"
        source={referralStepBannerImage}
        style={styles.stepsBannerImage}
      />
    </View>
  );
}

function ReferralFaqsSection() {
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
  const tc = useCopy();
  return (
    <View style={styles.faqCard}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.faqQuestionRow}>
        <View style={styles.faqQuestionCopy}>
          <Image alt="" source={helpBubbleIconImage} style={styles.helpBubbleIcon} />
          <Text style={styles.faqQuestion}>{tc(item.question)}</Text>
        </View>
        <ChevronDownIcon
          color="#3B3B3B"
          size={20}
          strokeWidth={typography.iconStrokeWidth}
          style={expanded ? styles.faqChevronExpanded : null}
        />
      </Pressable>
      {expanded ? <Text style={styles.faqAnswer}>{tc(item.answer)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: "#DCEEFF",
    borderColor: "#B8D4EF",
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
  referralBlueShell: {
    backgroundColor: "#DCEEFF",
    minHeight: 1040,
    width: "100%",
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: "rgba(16, 53, 34, 0.12)",
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
  heroBanner: {
    aspectRatio: 924 / 184,
    backgroundColor: "#F8FBFF",
    borderRadius: 16,
    height: 88,
    overflow: "hidden",
    width: "100%",
  },
  heroBannerDesktop: {
    height: 184,
  },
  earnCard: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(184, 212, 239, 0.46)",
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: "0 4px 22.9px rgba(0,0,0,0.05)",
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
    color: "#103522",
    fontFamily: typography.family,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  earnSubtitle: {
    color: "#007D5E",
    fontFamily: typography.family,
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 28,
  },
  copySection: {
    gap: 14,
  },
  shareTitle: {
    color: "#103522",
    fontFamily: typography.family,
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 27,
  },
  copyButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    gap: 12,
    justifyContent: "center",
    minHeight: 105,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    fontFamily: typography.family,
    fontSize: 18,
    lineHeight: 25,
  },
  socialSection: {
    borderTopColor: "#EAEAEA",
    borderTopWidth: 1,
    gap: 18,
    paddingTop: 24,
  },
  socialTitle: {
    color: "#1A1A1A",
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },
  socialRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 24,
    paddingLeft: 4,
  },
  socialButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  brandIcon: {
    fontFamily: typography.family,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  facebookIcon: {
    fontSize: 34,
    lineHeight: 36,
  },
  linkedinIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  xIcon: {
    fontSize: 30,
    lineHeight: 34,
  },
  invitationSection: {
    gap: 22,
  },
  invitationTitle: {
    color: "#3A4B61",
    fontFamily: typography.family,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  tabs: {
    flexDirection: "row",
    gap: 12,
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 62,
    paddingHorizontal: 8,
  },
  tabButtonActive: {
    borderBottomColor: colors.primaryDark,
    borderBottomWidth: 3,
  },
  tabButtonInactive: {
    backgroundColor: "rgba(176, 203, 232, 0.48)",
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  tabText: {
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  tabTextInactive: {
    color: "#6F849C",
  },
  tableCard: {
    backgroundColor: "rgba(255,255,255,0.36)",
    borderColor: "#B8D4EF",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: "rgba(246,246,246,0.42)",
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  tableHeaderText: {
    color: "#2F4055",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
  tableRow: {
    borderTopColor: "rgba(184, 212, 239, 0.55)",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  tableCell: {
    color: "#3A4B61",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 18,
    lineHeight: 25,
  },
  tableCellRight: {
    textAlign: "right",
  },
  invitationStatusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E6F7ED",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  invitationStatusPillText: {
    color: "#00B14F",
    fontFamily: typography.family,
    fontSize: typography.label,
    fontWeight: typography.labelWeight,
    lineHeight: typography.labelLineHeight,
  },
  stepsBanner: {
    aspectRatio: 924 / 472,
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
  },
  stepsBannerImage: {
    height: "100%",
    width: "100%",
  },
  faqSection: {
    gap: 16,
  },
  faqTitle: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 31,
  },
  faqStack: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: colors.white,
    borderColor: "#B7E7DB",
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
    color: "#3B3B3B",
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
    color: "#7F7F7F",
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 21,
    paddingBottom: 16,
    paddingLeft: 45,
    paddingRight: 16,
  },
});
