import { CustomerGoGoTrackScreen } from "@mobile/screens/CustomerGoGoTrackScreen";
import { gototrackDetector } from "@mobile/gototrack/detectorInstance";

export default function GoGoTrackOnboardingRoute() {
  return <CustomerGoGoTrackScreen mode="onboarding" detector={gototrackDetector} />;
}
