import { Link } from "expo-router";
import {
  BookOpen as GuideIcon,
  CalendarDays as CalendarIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  CircleHelp as HelpIcon,
  Hash as HashIcon,
  ImagePlus as ImageIcon,
  MessageCircle as SupportIcon,
  PencilLine as NoteIcon,
  ReceiptText as AmountIcon,
  ShoppingBag as ShoppingIcon,
  Store as StoreIcon,
  UserRound as UserIcon,
} from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { mobileShellLayout, webMissingOrdersPage } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type MissingOrdersSection = (typeof webMissingOrdersPage.sections)[number];
type MissingOrdersField = MissingOrdersSection["fields"][number];
type MissingOrdersQuickCard = (typeof webMissingOrdersPage.quickCards)[number];

export function CustomerMissingOrdersScreen() {
  return (
    <MissingOrdersSubPage>
      <MissingOrdersTopBar />
      <View style={styles.content}>
        <MissingOrdersFormPanel />
        <MissingOrdersQuickCards />
        <MissingOrdersFaqSection />
      </View>
    </MissingOrdersSubPage>
  );
}

function MissingOrdersSubPage({ children }: { children: ReactNode }) {
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={webMissingOrdersPage.title}>
      <View style={[styles.surface, styles.missingOrdersSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function MissingOrdersTopBar() {
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={26} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{webMissingOrdersPage.title}</Text>
      </Pressable>
    </Link>
  );
}

function MissingOrdersFormPanel() {
  return (
    <View style={styles.formPanel}>
      <View style={styles.formHeader}>
        <View style={styles.formHeaderCopy}>
          <Text style={styles.formTitle}>{webMissingOrdersPage.title}</Text>
          <Text style={styles.formIntro}>{webMissingOrdersPage.intro}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable disabled style={[styles.outlineButton, styles.disabledButton]}>
            <Text style={[styles.outlineButtonText, styles.disabledButtonText]}>
              {webMissingOrdersPage.clearActionLabel}
            </Text>
          </Pressable>
          <MotionPressable pressScale={0.98} style={styles.lineButton}>
            <SupportIcon color="#06C755" size={18} strokeWidth={typography.iconStrokeWidth} />
            <Text style={styles.lineButtonText}>{webMissingOrdersPage.supportActionLabel}</Text>
          </MotionPressable>
        </View>
      </View>

      <View style={styles.sectionStack}>
        {webMissingOrdersPage.sections.map((section) => (
          <MissingOrdersFormSection key={section.id} section={section} />
        ))}
      </View>

      <View style={styles.bulletPanel}>
        {webMissingOrdersPage.bullets.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>{"•"}</Text>
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>

      <MotionPressable pressScale={0.98} style={styles.submitButton}>
        <Text style={styles.submitButtonText}>{webMissingOrdersPage.submitActionLabel}</Text>
      </MotionPressable>
    </View>
  );
}

function MissingOrdersFormSection({ section }: { section: MissingOrdersSection }) {
  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionHelp}>{section.help}</Text>
      </View>
      <View style={styles.fieldStack}>
        {section.fields.map((field) => (
          <MissingOrdersFieldRow field={field} key={field.label} />
        ))}
      </View>
    </View>
  );
}

function MissingOrdersFieldRow({ field }: { field: MissingOrdersField }) {
  const isAttachment = field.icon === "image";

  return (
    <View style={isAttachment ? styles.attachmentField : styles.fieldRow}>
      <View style={styles.fieldIcon}>
        {renderFieldIcon(field.icon)}
      </View>
      <View style={styles.fieldCopy}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <Text style={[styles.fieldValue, isAttachment ? styles.attachmentValue : null]}>
          {field.value}
        </Text>
        <Text style={styles.fieldHelper}>{field.helper}</Text>
      </View>
      {field.icon === "store" ? (
        <ChevronDownIcon color={colors.muted} size={18} strokeWidth={typography.iconStrokeWidth} />
      ) : null}
    </View>
  );
}

function MissingOrdersQuickCards() {
  const { width } = useWindowDimensions();
  const desktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <View style={styles.quickCardsGrid}>
      {webMissingOrdersPage.quickCards.map((card) => (
        <MissingOrdersQuickCard card={card} desktop={desktop} key={card.accent} />
      ))}
    </View>
  );
}

function MissingOrdersQuickCard({
  card,
  desktop,
}: {
  card: MissingOrdersQuickCard;
  desktop: boolean;
}) {
  return (
    <MotionPressable
      accessibilityLabel={`${card.title} ${card.accent}`}
      accessibilityRole="link"
      pressScale={0.99}
      style={[styles.quickCard, desktop ? styles.quickCardDesktop : null]}
    >
      <View style={styles.quickCardArt}>
        {renderQuickCardIcon(card.icon, desktop ? 42 : 36)}
      </View>
      <View style={styles.quickCardCopy}>
        <Text style={styles.quickCardTitle}>{card.title}</Text>
        <Text style={styles.quickCardAccent}>{card.accent}</Text>
      </View>
    </MotionPressable>
  );
}

function MissingOrdersFaqSection() {
  return (
    <View style={styles.faqSection}>
      <Text style={styles.faqTitle}>{webMissingOrdersPage.faqTitle}</Text>
      <View style={styles.faqStack}>
        {webMissingOrdersPage.faqs.map((faq, index) => (
          <View key={faq.question} style={styles.faqCard}>
            <View style={styles.faqQuestionRow}>
              <HelpIcon color={colors.primaryDark} size={21} strokeWidth={typography.iconStrokeWidth} />
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <ChevronDownIcon
                color={colors.ink}
                size={16}
                strokeWidth={typography.iconStrokeWidth}
              />
            </View>
            {index === 0 ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function renderFieldIcon(icon: MissingOrdersField["icon"]): ReactNode {
  const iconProps = {
    color: colors.primaryDark,
    size: 18,
    strokeWidth: typography.iconStrokeWidth,
  };

  switch (icon) {
    case "amount":
      return <AmountIcon {...iconProps} />;
    case "calendar":
      return <CalendarIcon {...iconProps} />;
    case "hash":
      return <HashIcon {...iconProps} />;
    case "image":
      return <ImageIcon {...iconProps} />;
    case "note":
      return <NoteIcon {...iconProps} />;
    case "store":
      return <StoreIcon {...iconProps} />;
    case "user":
      return <UserIcon {...iconProps} />;
  }
}

function renderQuickCardIcon(icon: MissingOrdersQuickCard["icon"], size: number): ReactNode {
  const iconProps = {
    color: colors.primaryDark,
    size,
    strokeWidth: 1.55,
  };

  switch (icon) {
    case "guide":
      return <GuideIcon {...iconProps} />;
    case "shopping":
      return <ShoppingIcon {...iconProps} />;
    case "support":
      return <SupportIcon {...iconProps} />;
  }
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    overflow: "hidden",
    width: "100%",
  },
  missingOrdersSurfaceBleed: {
    marginHorizontal: -8,
    marginTop: 18,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topBarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    gap: 18,
    paddingBottom: 30,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  formPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    padding: 16,
  },
  formHeader: {
    gap: 14,
  },
  formHeaderCopy: {
    gap: 6,
  },
  formTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 30,
  },
  formIntro: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 13,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  outlineButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: "#06C755",
    borderRadius: radii.md,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 18,
  },
  disabledButton: {
    borderColor: "rgba(152, 152, 152, 0.45)",
  },
  outlineButtonText: {
    color: "#06C755",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButtonText: {
    color: colors.textSoft,
  },
  lineButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: "#06C755",
    borderRadius: radii.md,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 18,
  },
  lineButtonText: {
    color: "#06C755",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  sectionStack: {
    gap: 16,
  },
  formSection: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E6E6E6",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  sectionHeader: {
    gap: 5,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  sectionHelp: {
    color: "#656565",
    fontFamily: typography.family,
    fontSize: 13,
    lineHeight: 19,
  },
  fieldStack: {
    gap: 12,
  },
  fieldRow: {
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderColor: "rgba(152,152,152,0.38)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 74,
    padding: 12,
  },
  attachmentField: {
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderColor: "#D4D4D4",
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 92,
    padding: 12,
  },
  fieldIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  fieldCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  fieldLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  fieldValue: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
  },
  attachmentValue: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  fieldHelper: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 11,
    lineHeight: 16,
  },
  bulletPanel: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
  },
  bulletDot: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 19,
  },
  bulletText: {
    color: "#656565",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 12,
    lineHeight: 19,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  submitButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "700",
  },
  quickCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickCard: {
    backgroundColor: colors.card,
    borderColor: "rgba(59, 59, 59, 0.5)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: "100%",
    flexGrow: 1,
    minHeight: 148,
    overflow: "hidden",
  },
  quickCardDesktop: {
    flexBasis: "30%",
  },
  quickCardArt: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderBottomColor: "rgba(0, 170, 128, 0.12)",
    borderBottomWidth: 1,
    height: 72,
    justifyContent: "center",
  },
  quickCardCopy: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  quickCardTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    textAlign: "center",
  },
  quickCardAccent: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
    textAlign: "center",
  },
  faqSection: {
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  faqTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
    textAlign: "center",
  },
  faqStack: {
    gap: 8,
    maxWidth: 948,
    width: "100%",
  },
  faqCard: {
    backgroundColor: colors.card,
    borderBottomColor: "#B7E7DB",
    borderBottomWidth: 1,
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  faqQuestionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  faqQuestion: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
  },
  faqAnswer: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 29,
    paddingTop: 8,
  },
});
