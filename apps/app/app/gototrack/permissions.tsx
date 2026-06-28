import { gototrackDetector } from "@mobile/gototrack/detectorInstance";
import { CustomerGoGoTrackScreen } from "@mobile/screens/CustomerGoGoTrackScreen";

export default function GoGoTrackPermissionsRoute() {
  return <CustomerGoGoTrackScreen mode="permissions" detector={gototrackDetector} />;
}
