import { gogosenseDetector } from "@mobile/gogosense/detectorInstance";
import { CustomerGoGoSenseScreen } from "@mobile/screens/CustomerGoGoSenseScreen";

export default function GoGoSenseRoute() {
  return <CustomerGoGoSenseScreen mode="hub" detector={gogosenseDetector} />;
}
