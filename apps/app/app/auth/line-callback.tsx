import { captureLineAuthReturnHref } from "@mobile/auth/lineLogin";
import { CustomerLineAuthCallbackScreen } from "@mobile/screens/CustomerLineAuthCallbackScreen";

// Capture LIFF/OAuth return params at module evaluation — before React effects
// or Expo Router can strip unknown search params from the address bar.
captureLineAuthReturnHref();

export default function LineAuthCallbackRoute() {
  return <CustomerLineAuthCallbackScreen />;
}
