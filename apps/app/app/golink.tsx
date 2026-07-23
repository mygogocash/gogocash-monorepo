import { Redirect } from "expo-router";

import { isGoLinkEnabled } from "@mobile/config/featureFlags";
import { CustomerGoLinkScreen } from "@mobile/screens/CustomerGoLinkScreen";

export default function GolinkRoute() {
  // GoLink rollout: the standalone /golink route only runs the LIVE flow when
  // FULLY enabled. isGoLinkEnabled() === (mode === "enabled"), so both "hidden"
  // AND "comingSoon" bounce home here — a direct URL can never reach a working
  // GoLink before launch. The embedded surfaces (nav tab, home box) stay visible
  // but disabled; this route has no visible chrome, so redirecting is cleanest.
  if (!isGoLinkEnabled()) {
    return <Redirect href="/" />;
  }
  return <CustomerGoLinkScreen />;
}
