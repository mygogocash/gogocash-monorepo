import { useLocalSearchParams } from "expo-router";

import { normalizeRouteParam } from "@mobile/navigation/routeParams";
import { CustomerCategoryDetailScreen } from "@mobile/screens/CustomerCategoryDetailScreen";

export default function CategoryDetailRoute() {
  const { name } = useLocalSearchParams<{ name?: string }>();

  return <CustomerCategoryDetailScreen categoryName={normalizeRouteParam(name)} />;
}
