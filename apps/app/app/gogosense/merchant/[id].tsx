import { useLocalSearchParams } from "expo-router";

import { normalizeRouteParam } from "@mobile/navigation/routeParams";
import { CustomerGoGoSenseScreen } from "@mobile/screens/CustomerGoGoSenseScreen";

export default function GoGoSenseMerchantRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <CustomerGoGoSenseScreen merchantId={normalizeRouteParam(id)} mode="merchant" />;
}
