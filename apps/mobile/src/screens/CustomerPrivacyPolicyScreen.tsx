import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomerCookieConsentBanner } from "@mobile/components/CustomerCookieConsentBanner";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopHeader } from "@mobile/components/CustomerDesktopHeader";
import { CustomerLineOfficialFab } from "@mobile/components/CustomerLineOfficialFab";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { mobileShellLayout, webPrivacyPolicyPage } from "@mobile/design/webDesignParity";
import { privacyPolicyMarkdown } from "@mobile/legal/privacyPolicyMarkdown";
import { colors, spacing, typography } from "@mobile/theme/tokens";

type LegalMarkdownBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "hr" }
  | { items: string[]; kind: "list" }
  | { kind: "paragraph"; text: string };

const legalArticleMaxWidth = webPrivacyPolicyPage.legalArticleMaxWidth;
const legalBlocks = parseLegalMarkdown(privacyPolicyMarkdown);

export function CustomerPrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <View style={styles.viewport}>
      <View style={styles.shell}>
        {isDesktop ? <CustomerDesktopHeader viewportWidth={width} /> : null}
        <ScrollView
          contentContainerStyle={[
            styles.publicLegalPage,
            isDesktop ? styles.publicLegalPageDesktop : styles.publicLegalPageMobile,
            {
              paddingBottom: isDesktop
                ? mobileShellLayout.desktopBottomClearance + 120
                : mobileShellLayout.bottomNavClearance + 180,
              paddingTop: isDesktop
                ? mobileShellLayout.desktopHomeTopGap
                : Math.max(32, insets.top + 32),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <PrivacyPolicyArticle isDesktop={isDesktop} />
          {isDesktop ? (
            <View style={styles.desktopFooter}>
              <CustomerDesktopFooter horizontalPadding={0} viewportWidth={width} />
            </View>
          ) : null}
        </ScrollView>
        {isDesktop ? null : (
          <CustomerMobileBottomNav activeRouteId="profile" bottomInset={insets.bottom} />
        )}
      </View>
      <CustomerCookieConsentBanner isDesktop={isDesktop} />
      {isDesktop ? <CustomerLineOfficialFab /> : null}
    </View>
  );
}

function PrivacyPolicyArticle({ isDesktop }: { isDesktop: boolean }) {
  return (
    <View
      accessibilityLabel={webPrivacyPolicyPage.articleLabel}
      testID="privacy-policy-article"
      style={[
        styles.legalArticle,
        isDesktop ? styles.legalArticleDesktop : styles.legalArticleMobile,
      ]}
    >
      {legalBlocks.map((block, index) => (
        <LegalMarkdownBlock block={block} isDesktop={isDesktop} key={`${block.kind}-${index}`} />
      ))}
    </View>
  );
}

function LegalMarkdownBlock({
  block,
  isDesktop,
}: {
  block: LegalMarkdownBlock;
  isDesktop: boolean;
}) {
  if (block.kind === "heading") {
    const headingStyle =
      block.level === 1
        ? [styles.legalH1, isDesktop ? styles.legalH1Desktop : null]
        : block.level === 2
          ? [styles.legalH2, isDesktop ? styles.legalH2Desktop : null]
          : [styles.legalH3, isDesktop ? styles.legalH3Desktop : null];

    return <Text style={headingStyle}>{renderLegalInline(block.text)}</Text>;
  }

  if (block.kind === "hr") {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.legalRule}
      />
    );
  }

  if (block.kind === "list") {
    return (
      <View style={styles.legalList}>
        {block.items.map((item) => (
          <View key={item} style={styles.legalListItem}>
            <Text style={[styles.legalBullet, isDesktop ? styles.legalBulletDesktop : null]}>
              {"\u2022"}
            </Text>
            <Text style={[styles.legalBody, isDesktop ? styles.legalBodyDesktop : null]}>
              {renderLegalInline(item)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Text style={[styles.legalBody, isDesktop ? styles.legalBodyDesktop : null]}>
      {renderLegalInline(block.text)}
    </Text>
  );
}

function renderLegalInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={`${part}-${index}`} style={styles.legalStrong}>
            {part.slice(2, -2)}
          </Text>
        );
      }

      return <Text key={`${part}-${index}`}>{part}</Text>;
    });
}

function parseLegalMarkdown(markdown: string): LegalMarkdownBlock[] {
  const blocks: LegalMarkdownBlock[] = [];
  const paragraphLines: string[] = [];
  const lines = markdown.split(/\r?\n/);

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({ kind: "paragraph", text: paragraphLines.join("").trim() });
    paragraphLines.length = 0;
  };

  const pushParagraphLine = (line: string) => {
    const hasHardBreak = /\s{2,}$/.test(line);
    paragraphLines.push(line.trimEnd());
    paragraphLines.push(hasHardBreak ? "\n" : " ");
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (trimmed === "---") {
      flushParagraph();
      blocks.push({ kind: "hr" });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      flushParagraph();

      while (index < lines.length) {
        const itemLine = lines[index].trim();
        if (!itemLine.startsWith("- ")) {
          index -= 1;
          break;
        }
        items.push(itemLine.slice(2));
        index += 1;
      }

      blocks.push({ items, kind: "list" });
      continue;
    }

    pushParagraphLine(line);
  }

  flushParagraph();
  return blocks;
}

const styles = StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
  },
  shell: {
    backgroundColor: colors.background,
    flex: 1,
    width: "100%",
  },
  publicLegalPage: {
    alignItems: "center",
    minHeight: "100%",
  },
  publicLegalPageMobile: {
    paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
  },
  publicLegalPageDesktop: {
    paddingHorizontal: mobileShellLayout.desktopContentHorizontalPadding,
  },
  legalArticle: {
    maxWidth: legalArticleMaxWidth,
    width: "100%",
  },
  legalArticleMobile: {
    paddingHorizontal: 0,
  },
  legalArticleDesktop: {
    paddingHorizontal: 24,
  },
  desktopFooter: {
    marginTop: 64,
    width: "100%",
  },
  legalH1: {
    color: "#1A1A1A",
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32,
    marginBottom: 12,
    marginTop: 2,
  },
  legalH1Desktop: {
    fontSize: 30,
    lineHeight: 38,
  },
  legalH2: {
    color: "#1A1A1A",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
    marginBottom: 12,
    marginTop: 32,
  },
  legalH2Desktop: {
    fontSize: 24,
    lineHeight: 32,
  },
  legalH3: {
    color: "#1A1A1A",
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 8,
    marginTop: 20,
  },
  legalH3Desktop: {
    fontSize: 18,
    lineHeight: 26,
  },
  legalBody: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
    marginVertical: 4,
  },
  legalBodyDesktop: {
    fontSize: 16,
    lineHeight: 27,
  },
  legalStrong: {
    fontWeight: "700",
  },
  legalList: {
    gap: 0,
    marginBottom: 8,
    marginTop: 6,
  },
  legalListItem: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingLeft: 16,
  },
  legalBullet: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 22,
    width: 10,
  },
  legalBulletDesktop: {
    fontSize: 16,
    lineHeight: 27,
  },
  legalRule: {
    borderTopColor: "rgba(48, 65, 85, 0.14)",
    borderTopWidth: 1,
    marginVertical: 32,
    width: "100%",
  },
});
