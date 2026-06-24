import { CustomerGoGoSenseScreen } from "@mobile/screens/CustomerGoGoSenseScreen";
import { gogosenseDetector } from "@mobile/gogosense/detectorInstance";

export default function GoGoSenseTimelineRoute() {
  return <CustomerGoGoSenseScreen mode="timeline" detector={gogosenseDetector} />;
}
