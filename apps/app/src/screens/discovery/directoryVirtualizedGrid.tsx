import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo, type ReactElement } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { spacing } from "@mobile/theme/tokens";

export function chunkDirectoryGridRows<T>(items: readonly T[], columns: number): T[][] {
  if (columns <= 0 || items.length === 0) {
    return [];
  }

  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}

export function getProductDiscoveryCardHeight(cardWidth: number) {
  return cardWidth + spacing.sm * 2 + 148;
}

type DirectoryVirtualizedGridProps<T extends { id: string }> = {
  cardWidth: number;
  columns: number;
  estimatedRowHeight: number;
  gap: number;
  gridStyle?: ViewStyle;
  items: readonly T[];
  renderItemContent: (item: T) => ReactElement;
};

const gridRowStyle: ViewStyle = {
  flexDirection: "row",
};

export function DirectoryVirtualizedGrid<T extends { id: string }>({
  cardWidth,
  columns,
  estimatedRowHeight,
  gap,
  gridStyle,
  items,
  renderItemContent,
}: DirectoryVirtualizedGridProps<T>) {
  const rows = useMemo(() => chunkDirectoryGridRows(items, columns), [columns, items]);
  const rowStride = estimatedRowHeight + gap;
  const listHeight = rows.length > 0 ? rows.length * rowStride - gap : 0;

  const renderRow = useCallback(
    ({ item: row }: { item: readonly T[] }) => (
      <View style={[gridRowStyle, { gap, marginBottom: gap }]}>
        {row.map((entry) => (
          <View key={entry.id} style={{ width: cardWidth }}>
            {renderItemContent(entry)}
          </View>
        ))}
      </View>
    ),
    [cardWidth, gap, renderItemContent]
  );

  return (
    <FlashList
      data={rows}
      drawDistance={estimatedRowHeight * 2}
      keyExtractor={(_row, index) => `directory-grid-row-${index}`}
      renderItem={renderRow}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      style={StyleSheet.flatten([gridStyle, { height: listHeight }])}
    />
  );
}
