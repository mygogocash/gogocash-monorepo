import { gogosenseDetector } from "@mobile/gogosense/detectorInstance";
import { CustomerGoGoSenseScreen } from "@mobile/screens/CustomerGoGoSenseScreen";

export default function GoGoSensePermissionsRoute() {
  return <CustomerGoGoSenseScreen mode="permissions" detector={gogosenseDetector} />;
}
