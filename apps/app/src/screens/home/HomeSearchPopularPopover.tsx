import { useEffect, useMemo } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { getHomeSearchMatches, webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { HomeSearchIntro } from "./HomeSearchIntro";
import { HomeSearchResultRow } from "./HomeSearchResultRow";
import { useHomeScreenStyles } from "./homeScreenHooks";

export function HomeSearchPopularPopover({
  horizontalPadding,
  onClose,
  onExited,
  query,
  top,
  visible,
}: {
  horizontalPadding: number;
  onClose: () => void;
  onExited: () => void;
  query: string;
  top: number;
  visible: boolean;
}) {
  const styles = useHomeScreenStyles();
  const tc = useCopy();
  const searchMatches = getHomeSearchMatches(query);
  const hasSearchQuery = query.trim().length > 0;
  const popoverOpacity = useMemo(() => new Animated.Value(0), []);
  const popoverTranslateY = useMemo(() => new Animated.Value(-8), []);

  useEffect(() => {
    popoverOpacity.stopAnimation();
    popoverTranslateY.stopAnimation();

    if (visible) {
      Animated.parallel([
        Animated.timing(popoverOpacity, {
          duration: motion.duration.base,
          easing: motion.easing.out,
          toValue: 1,
          useNativeDriver: motion.useNativeDriver,
        }),
        Animated.timing(popoverTranslateY, {
          duration: motion.duration.base,
          easing: motion.easing.out,
          toValue: 0,
          useNativeDriver: motion.useNativeDriver,
        }),
      ]).start();

      return () => {
        popoverOpacity.stopAnimation();
        popoverTranslateY.stopAnimation();
      };
    }

    Animated.parallel([
      Animated.timing(popoverOpacity, {
        duration: motion.duration.fast,
        easing: motion.easing.in,
        toValue: 0,
        useNativeDriver: motion.useNativeDriver,
      }),
      Animated.timing(popoverTranslateY, {
        duration: motion.duration.fast,
        easing: motion.easing.in,
        toValue: -8,
        useNativeDriver: motion.useNativeDriver,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onExited();
      }
    });

    return () => {
      popoverOpacity.stopAnimation();
      popoverTranslateY.stopAnimation();
    };
  }, [onExited, popoverOpacity, popoverTranslateY, visible]);

  return (
    <View style={[styles.searchPopoverLayer, { pointerEvents: visible ? "box-none" : "none" }]}>
      <Pressable
        accessibilityLabel={tc("Close search suggestions")}
        accessibilityRole="button"
        onPress={onClose}
        style={styles.searchPopoverBackdrop}
      />
      <Animated.View
        style={[
          styles.searchPopoverPosition,
          {
            left: horizontalPadding,
            opacity: popoverOpacity,
            right: horizontalPadding,
            top,
            transform: [{ translateY: popoverTranslateY }],
          },
        ]}
      >
        <View style={styles.searchPopover}>
          <ScrollView
            contentContainerStyle={styles.searchPopoverContent}
            showsVerticalScrollIndicator={false}
            style={styles.searchPopoverScroll}
          >
            {hasSearchQuery ? (
              <View style={styles.searchTypedContent}>
                {searchMatches.length > 0 ? (
                  <>
                    <View style={styles.searchResultsHeading}>
                      <Text style={styles.searchResultsTitle}>
                        {tc(webHomeSearchPopularPanel.resultsTitle)}
                      </Text>
                      <Text style={styles.searchResultsSubtitle}>
                        {tc(webHomeSearchPopularPanel.resultsSubtitle)}
                      </Text>
                    </View>
                    <View style={styles.searchResultListCompact}>
                      {searchMatches.map((item) => (
                        <HomeSearchResultRow item={item} key={item.brand} variant="compact" />
                      ))}
                    </View>
                    <View style={styles.searchDivider} />
                  </>
                ) : (
                  <Text style={styles.searchNoMatchCard}>
                    {tc(webHomeSearchPopularPanel.noMatches)}
                  </Text>
                )}
                <HomeSearchIntro variant="compact" />
                <View style={styles.searchResultListCompact}>
                  {webHomeSearchPopularPanel.items.map((item) => (
                    <HomeSearchResultRow item={item} key={item.brand} variant="compact" />
                  ))}
                </View>
              </View>
            ) : (
              <>
                <HomeSearchIntro variant="large" />
                <View style={styles.searchResultList}>
                  {webHomeSearchPopularPanel.items.map((item) => (
                    <HomeSearchResultRow item={item} key={item.brand} variant="large" />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}
