import { CustomerGoGoSenseScreen } from "@mobile/screens/CustomerGoGoSenseScreen";
import { gogosenseDetector } from "@mobile/gogosense/detectorInstance";

export default function GoGoSenseRecoveryRoute() {
  return <CustomerGoGoSenseScreen mode="recovery" detector={gogosenseDetector} />;
}
