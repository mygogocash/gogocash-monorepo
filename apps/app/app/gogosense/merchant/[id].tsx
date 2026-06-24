import { useLocalSearchParams } from "expo-router";

import { normalizeRouteParam } from "@mobile/navigation/routeParams";
import { CustomerGoGoSenseScreen } from "@mobile/screens/CustomerGoGoSenseScreen";
import { gogosenseDetector } from "@mobile/gogosense/detectorInstance";

export default function GoGoSenseMerchantRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <CustomerGoGoSenseScreen
      detector={gogosenseDetector}
      merchantId={normalizeRouteParam(id)}
      mode="merchant"
    />
  );
}
