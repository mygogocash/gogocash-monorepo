import { CustomerGoGoSenseScreen } from "@mobile/screens/CustomerGoGoSenseScreen";
import { gogosenseDetector } from "@mobile/gogosense/detectorInstance";

export default function GoGoSenseSettingsRoute() {
  return <CustomerGoGoSenseScreen mode="settings" detector={gogosenseDetector} />;
}
