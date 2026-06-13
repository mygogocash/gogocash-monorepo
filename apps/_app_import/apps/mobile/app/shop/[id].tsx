import { useLocalSearchParams } from "expo-router";

import { normalizeRouteParam } from "@mobile/navigation/routeParams";
import { CustomerShopDetailScreen } from "@mobile/screens/CustomerShopDetailScreen";

export default function ShopDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <CustomerShopDetailScreen shopId={normalizeRouteParam(id)} />;
}
