import { Redirect } from "expo-router";

import { isCreditScoreEnabled } from "@mobile/config/featureFlags";

export default function ProfileRatingRoute() {
  // When My Rating Score is hidden pre-launch, send the alias to /profile
  // instead of bouncing through the (also-guarded) /credit-score screen.
  return <Redirect href={isCreditScoreEnabled() ? "/credit-score" : "/profile"} />;
}
