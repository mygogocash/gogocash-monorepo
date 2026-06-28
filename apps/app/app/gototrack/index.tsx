import { gototrackDetector } from "@mobile/gototrack/detectorInstance";
import { CustomerGoGoTrackScreen } from "@mobile/screens/CustomerGoGoTrackScreen";

export default function GoGoTrackRoute() {
  return <CustomerGoGoTrackScreen mode="hub" detector={gototrackDetector} />;
}
