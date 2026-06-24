import { View } from "react-native";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { ShopDirectoryPagination } from "./ShopDirectoryPagination";

export function CategoryDirectoryPagination({
  activePage,
  onChangePage,
  totalPages,
}: {
  activePage: number;
  onChangePage: (page: number) => void;
  totalPages: number;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  return (
    <View style={styles.categoryDirectoryPagination}>
      <ShopDirectoryPagination
        activePage={activePage}
        onChangePage={onChangePage}
        totalPages={totalPages}
      />
    </View>
  );
}
