import { CustomerGoGoTrackScreen } from "@mobile/screens/CustomerGoGoTrackScreen";
import { gototrackDetector } from "@mobile/gototrack/detectorInstance";

export default function GoGoTrackTimelineRoute() {
  return <CustomerGoGoTrackScreen mode="timeline" detector={gototrackDetector} />;
}
