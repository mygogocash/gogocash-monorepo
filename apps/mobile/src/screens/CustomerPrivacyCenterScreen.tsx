import { Link } from "expo-router";
import { ChevronLeft as ChevronLeftIcon, Lock as LockIcon } from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout, webPrivacyCenterPage } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type OptionalPurpose = (typeof webPrivacyCenterPage.optionalPurposes)[number];
type OptionalPurposeId = OptionalPurpose["id"];

const initialOptionalConsentState: Record<OptionalPurposeId, boolean> = {
  ai: false,
  analytics: false,
  b2b: false,
  marketing: false,
};

export function CustomerPrivacyCenterScreen() {
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const [optionalConsents, setOptionalConsents] = useState(initialOptionalConsentState);

  const setOptionalConsent = (id: OptionalPurposeId, enabled: boolean) => {
    setOptionalConsents((current) => ({ ...current, [id]: enabled }));
  };

  const allOptionalEnabled = webPrivacyCenterPage.optionalPurposes.every(
    (purpose) => optionalConsents[purpose.id]
  );

  return (
    <PrivacyCenterSubPage>
      <View style={styles.privacyBlueShell}>
        {/* Mobile-only back link — on desktop the persistent sidebar handles navigation
            (web parity: the SubPage topbar is md:hidden). */}
        {isDesktop ? null : <PrivacyCenterTopBar />}
        <View style={styles.content}>
          <View style={styles.sectionIntro}>
            <Text style={styles.sectionTitle}>{tc(webPrivacyCenterPage.sectionTitle)}</Text>
            <Text style={styles.microNotice}>{tc(webPrivacyCenterPage.microNotice)}</Text>
          </View>
          <ConsentHeroCard
            allOptionalEnabled={allOptionalEnabled}
            onAcceptAll={() => {
              const nextState = webPrivacyCenterPage.optionalPurposes.reduce(
                (state, purpose) => ({ ...state, [purpose.id]: true }),
                {} as Record<OptionalPurposeId, boolean>
              );
              setOptionalConsents(nextState);
            }}
          />
          <View style={styles.optionalSection}>
            <Text style={styles.optionalTitle}>{tc(webPrivacyCenterPage.optionalTitle)}</Text>
            <View style={styles.optionalStack}>
              {webPrivacyCenterPage.optionalPurposes.map((purpose) => (
                <OptionalConsentCard
                  enabled={optionalConsents[purpose.id]}
                  key={purpose.id}
                  onToggle={() => setOptionalConsent(purpose.id, !optionalConsents[purpose.id])}
                  purpose={purpose}
                />
              ))}
            </View>
          </View>
          <RequiredConsentCard />
        </View>
      </View>
    </PrivacyCenterSubPage>
  );
}

function PrivacyCenterSubPage({ children }: { children: ReactNode }) {
  const tc = useCopy();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(webPrivacyCenterPage.title)}>
      <View style={[styles.surface, styles.privacyCenterSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function PrivacyCenterTopBar() {
  const tc = useCopy();
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={28} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{tc(webPrivacyCenterPage.title)}</Text>
      </Pressable>
    </Link>
  );
}

function ConsentHeroCard({
  allOptionalEnabled,
  onAcceptAll,
}: {
  allOptionalEnabled: boolean;
  onAcceptAll: () => void;
}) {
  const tc = useCopy();
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>{tc(webPrivacyCenterPage.hero.title)}</Text>
        <Text style={styles.heroBody}>{tc(webPrivacyCenterPage.hero.body)}</Text>
      </View>
      <MotionPressable
        accessibilityRole="button"
        disabled={allOptionalEnabled}
        onPress={onAcceptAll}
        pressScale={0.98}
        style={[styles.acceptButton, allOptionalEnabled ? styles.acceptButtonDisabled : null]}
      >
        <Text style={styles.acceptButtonText}>
          {allOptionalEnabled
            ? tc(webPrivacyCenterPage.hero.allEnabledLabel)
            : tc(webPrivacyCenterPage.hero.actionLabel)}
        </Text>
      </MotionPressable>
      <Text style={styles.heroHint}>{tc(webPrivacyCenterPage.hero.hint)}</Text>
    </View>
  );
}

function OptionalConsentCard({
  enabled,
  onToggle,
  purpose,
}: {
  enabled: boolean;
  onToggle: () => void;
  purpose: OptionalPurpose;
}) {
  const tc = useCopy();
  return (
    <View style={styles.optionalCard}>
      <View style={styles.optionalCopy}>
        <Text style={styles.optionalCardTitle}>{tc(purpose.title)}</Text>
        <Text style={styles.optionalCardDescription}>{tc(purpose.description)}</Text>
      </View>
      <Pressable
        accessibilityLabel={tc(purpose.title)}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        onPress={onToggle}
        style={styles.toggleRow}
      >
        <Text style={styles.toggleLabel}>
          {enabled ? tc(webPrivacyCenterPage.onLabel) : tc(webPrivacyCenterPage.offLabel)}
        </Text>
        <View style={[styles.toggleTrack, enabled ? styles.toggleTrackOn : null]}>
          <View style={[styles.toggleThumb, enabled ? styles.toggleThumbOn : null]} />
        </View>
      </Pressable>
    </View>
  );
}

function RequiredConsentCard() {
  const tc = useCopy();
  return (
    <View style={styles.requiredCard}>
      <View style={styles.requiredHeader}>
        <LockIcon color={colors.primaryDark} size={22} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.requiredTitle}>{tc(webPrivacyCenterPage.required.title)}</Text>
        <View style={styles.requiredBadge}>
          <Text style={styles.requiredBadgeText}>{tc(webPrivacyCenterPage.required.badge)}</Text>
        </View>
      </View>
      <Text style={styles.requiredBody}>{tc(webPrivacyCenterPage.required.description)}</Text>
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
  privacyCenterSurfaceBleed: {
    marginHorizontal: -8,
    marginTop: 18,
  },
  privacyBlueShell: {
    backgroundColor: "#DCEEFF",
    minHeight: 780,
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
    gap: 28,
    paddingBottom: 112,
    paddingHorizontal: spacing.md,
    paddingTop: 24,
  },
  sectionIntro: {
    gap: 6,
  },
  sectionTitle: {
    color: "#10253F",
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 29,
  },
  microNotice: {
    color: "#577291",
    fontFamily: typography.family,
    fontSize: 17,
    lineHeight: 27,
  },
  heroCard: {
    backgroundColor: "rgba(220, 238, 255, 0.92)",
    borderColor: "#B6D3EC",
    borderRadius: 18,
    borderWidth: 1,
    boxShadow: "0 2px 8px rgba(67, 96, 126, 0.16)",
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  heroCopy: {
    gap: 4,
  },
  heroTitle: {
    color: "#10253F",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  heroBody: {
    color: "#4E647D",
    fontFamily: typography.family,
    fontSize: 17,
    lineHeight: 27,
  },
  acceptButton: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  acceptButtonDisabled: {
    backgroundColor: "#79D8C0",
  },
  acceptButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center",
  },
  heroHint: {
    color: "#577291",
    fontFamily: typography.family,
    fontSize: 15,
    lineHeight: 22,
  },
  optionalSection: {
    gap: 8,
  },
  optionalTitle: {
    color: "#10253F",
    fontFamily: typography.family,
    fontSize: 21,
    fontWeight: "500",
    lineHeight: 28,
  },
  optionalStack: {
    gap: 14,
  },
  optionalCard: {
    backgroundColor: "rgba(220, 238, 255, 0.72)",
    borderColor: "#B6D3EC",
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.lg,
    minHeight: 150,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  optionalCopy: {
    gap: spacing.sm,
  },
  optionalCardTitle: {
    color: "#10253F",
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 23,
  },
  optionalCardDescription: {
    color: "#577291",
    fontFamily: typography.family,
    fontSize: 16,
    lineHeight: 25,
  },
  toggleRow: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
  },
  toggleLabel: {
    color: "#4E647D",
    fontFamily: typography.family,
    fontSize: 16,
    lineHeight: 22,
  },
  toggleTrack: {
    backgroundColor: "#879BB4",
    borderRadius: radii.chip,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 2,
    width: 48,
  },
  toggleTrackOn: {
    backgroundColor: colors.primaryDark,
  },
  toggleThumb: {
    backgroundColor: "#DDE9F6",
    borderRadius: radii.chip,
    boxShadow: "0 1px 4px rgba(16, 37, 63, 0.2)",
    height: 28,
    marginLeft: -2,
    width: 28,
  },
  toggleThumbOn: {
    marginLeft: 20,
  },
  requiredCard: {
    backgroundColor: "rgba(220, 238, 255, 0.72)",
    borderColor: "#B6D3EC",
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  requiredHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  requiredTitle: {
    color: "#10253F",
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  requiredBadge: {
    backgroundColor: "#CFF5EA",
    borderRadius: radii.chip,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  requiredBadgeText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
  },
  requiredBody: {
    color: "#4E647D",
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 21,
  },
});
