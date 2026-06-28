import { CustomerGoGoTrackScreen } from "@mobile/screens/CustomerGoGoTrackScreen";
import { gototrackDetector } from "@mobile/gototrack/detectorInstance";

export default function GoGoTrackRecoveryRoute() {
  return <CustomerGoGoTrackScreen mode="recovery" detector={gototrackDetector} />;
}
