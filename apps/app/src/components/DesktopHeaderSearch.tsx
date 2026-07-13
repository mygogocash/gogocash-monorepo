import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";

import { trackSearchOpen, trackSearchSubmit } from "@mobile/analytics/events";
import { useAnalytics } from "@mobile/analytics/useAnalytics";
import { useCopy } from "@mobile/i18n/useCopy";
import { normalizeSearchQuery, recordSearchQuery } from "@mobile/search/searchHistory";
import { webHomeSearchPlaceholder } from "@mobile/design/webDesignParity";
import { Search } from "@mobile/theme/icons";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

import { webSearchInputFocusReset } from "@mobile/screens/home/homeAssets";
import type { SearchAnchorFrame } from "@mobile/screens/home/searchPopoverFrame";

const webSearchShellMotionStyle = {
  transitionDuration: motion.cssTransition.duration,
  transitionProperty: motion.cssTransition.property,
  transitionTimingFunction: motion.cssTransition.timingFunction,
} as unknown as ViewStyle;

function getWebKeyboardShortcutLabel(): string {
  if (Platform.OS !== "web" || typeof navigator === "undefined") {
    return "";
  }

  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K";
}

export function DesktopHeaderSearch({
  onSearchFocus,
  onSearchFrameChange,
  onSearchQueryChange,
  searchQuery,
  viewportWidth,
}: {
  onSearchFocus?: () => void;
  onSearchFrameChange?: (frame: SearchAnchorFrame) => void;
  onSearchQueryChange?: (value: string) => void;
  searchQuery?: string;
  viewportWidth?: number;
} = {}) {
  const router = useRouter();
  const analytics = useAnalytics();
  const tc = useCopy();
  const { colors } = useTheme();
  const styles = useThemedStyles(createDesktopHeaderSearchStyles);
  const inputRef = useRef<TextInput>(null);
  const shellRef = useRef<View>(null);
  const pendingFocusSourceRef = useRef<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const query = searchQuery ?? internalQuery;
  const keyboardShortcutLabel = getWebKeyboardShortcutLabel();

  const setQuery = useCallback(
    (value: string) => {
      if (onSearchQueryChange) {
        onSearchQueryChange(value);
        return;
      }
      setInternalQuery(value);
    },
    [onSearchQueryChange],
  );

  const navigateToSearch = useCallback(
    (value: string) => {
      const normalizedQuery = normalizeSearchQuery(value);
      router.push(
        normalizedQuery
          ? ({ pathname: "/search", params: { q: normalizedQuery } } as never)
          : ("/search" as never),
      );
    },
    [router],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
    const source = pendingFocusSourceRef.current ?? "desktop_header";
    pendingFocusSourceRef.current = null;
    trackSearchOpen(analytics, { source });
    if (onSearchFocus) {
      onSearchFocus();
      return;
    }
    navigateToSearch(query);
  }, [analytics, navigateToSearch, onSearchFocus, query]);

  const handleSubmit = useCallback(() => {
    const normalizedQuery = normalizeSearchQuery(query);
    trackSearchSubmit(analytics, { query: normalizedQuery, source: "desktop_header" });
    if (normalizedQuery) {
      void recordSearchQuery(normalizedQuery);
    }
    navigateToSearch(query);
  }, [analytics, navigateToSearch, query]);

  // Window coordinates, because the home search popover renders on a
  // viewport-absolute layer outside the header's coordinate space.
  const reportSearchFrame = useCallback(() => {
    if (!onSearchFrameChange) {
      return;
    }
    shellRef.current?.measureInWindow((x, y, width, height) => {
      onSearchFrameChange({ height, width, x, y });
    });
  }, [onSearchFrameChange]);

  // onLayout only fires on size changes; a viewport resize can shift the
  // centered header cap (changing x) without resizing the shell, so re-measure
  // whenever the viewport width changes too.
  useEffect(() => {
    reportSearchFrame();
  }, [reportSearchFrame, viewportWidth]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) {
        return;
      }

      event.preventDefault();
      pendingFocusSourceRef.current = "keyboard_shortcut";
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <View
      onLayout={reportSearchFrame}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      ref={shellRef}
      style={StyleSheet.flatten([
        styles.shell,
        webSearchShellMotionStyle,
        hovered && !focused ? styles.shellHovered : null,
        focused ? styles.shellFocused : null,
        focused && Platform.OS === "web" ? styles.shellExpanded : null,
      ])}
    >
      <Search color={colors.primaryDark} size={20} strokeWidth={typography.iconStrokeWidth} />
      <TextInput
        accessibilityLabel={tc(webHomeSearchPlaceholder)}
        autoCapitalize="none"
        autoCorrect={false}
        nativeID="desktop-header-search-input"
        onBlur={() => setFocused(false)}
        onChangeText={setQuery}
        onFocus={handleFocus}
        onSubmitEditing={handleSubmit}
        placeholder={tc(webHomeSearchPlaceholder)}
        placeholderTextColor={colors.muted}
        ref={inputRef}
        returnKeyType="search"
        style={StyleSheet.flatten([styles.input, webSearchInputFocusReset])}
        testID="desktop-header-search-input"
        value={query}
      />
      {Platform.OS === "web" && !focused && keyboardShortcutLabel ? (
        <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.shortcutHint}>
          {keyboardShortcutLabel}
        </Text>
      ) : null}
    </View>
  );
}

function createDesktopHeaderSearchStyles(colors: ThemeColors) {
  return StyleSheet.create({
    shell: {
      alignItems: "center",
      backgroundColor: colors.field,
      borderColor: colors.border,
      borderRadius: radii.chip,
      borderWidth: 1,
      boxShadow: shadows.cardCss,
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
      maxWidth: 560,
      minHeight: 44,
      minWidth: 0,
      overflow: "hidden",
      paddingHorizontal: spacing.md,
    },
    shellExpanded: {
      maxWidth: 640,
    },
    shellHovered: {
      borderColor: pickThemed(colors, "rgba(0, 170, 128, 0.35)", "rgba(0, 204, 153, 0.35)"),
    },
    shellFocused: {
      backgroundColor: pickThemed(colors, "#FAFDFB", colors.primarySoft),
      borderColor: colors.primaryDark,
      boxShadow: pickThemed(
        colors,
        "0 8px 24px rgba(16, 53, 34, 0.08)",
        "0 8px 24px rgba(0, 0, 0, 0.35)",
      ),
    },
    input: {
      color: colors.ink,
      flex: 1,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: typography.bodyWeight,
      minWidth: 0,
      padding: 0,
    },
    shortcutHint: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 12,
      fontWeight: typography.bodyWeight,
      userSelect: "none",
    },
  });
}
