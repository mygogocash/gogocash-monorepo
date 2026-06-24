import { CustomerGoGoSenseScreen } from "@mobile/screens/CustomerGoGoSenseScreen";
import { gogosenseDetector } from "@mobile/gogosense/detectorInstance";

export default function GoGoSenseOnboardingRoute() {
  return <CustomerGoGoSenseScreen mode="onboarding" detector={gogosenseDetector} />;
}
