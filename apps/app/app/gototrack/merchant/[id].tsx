import { useLocalSearchParams } from "expo-router";

import { normalizeRouteParam } from "@mobile/navigation/routeParams";
import { CustomerGoGoTrackScreen } from "@mobile/screens/CustomerGoGoTrackScreen";
import { gototrackDetector } from "@mobile/gototrack/detectorInstance";

export default function GoGoTrackMerchantRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <CustomerGoGoTrackScreen
      detector={gototrackDetector}
      merchantId={normalizeRouteParam(id)}
      mode="merchant"
    />
  );
}
