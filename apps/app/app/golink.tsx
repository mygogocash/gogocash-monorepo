import { Redirect } from "expo-router";

import { isGoLinkEnabled } from "@mobile/config/featureFlags";
import { CustomerGoLinkScreen } from "@mobile/screens/CustomerGoLinkScreen";

export default function GolinkRoute() {
  // GoLink rollout flag: when hidden the standalone /golink route bounces home.
  // The embedded home sheet is gated separately by hiding its entry points.
  if (!isGoLinkEnabled()) {
    return <Redirect href="/" />;
  }
  return <CustomerGoLinkScreen />;
}
