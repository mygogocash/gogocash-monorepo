import { Redirect } from "expo-router";

import { buildProtectedLoginRedirect } from "@mobile/auth/routeGuard";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { CustomerWalletScreen } from "@mobile/screens/CustomerWalletScreen";

export default function WalletRoute() {
  const { isAuthed, ready } = useAuthGuardSession();

  // `/wallet` self-guards like the profile tab: keep the route in the root stack
  // for unauthenticated users so `<Redirect>` can land on `/login?callbackUrl=/wallet`
  // instead of expo-router falling back to home when the screen is Stack.Protected-only.
  // Show a neutral loading placeholder while the session hydrates instead of a blank
  // screen — mirrors the Profile tab and avoids a blank Wallet flash on cold start.
  if (!ready) {
    return <CustomerRouteState testID="wallet-loading" variant="loading" />;
  }

  if (!isAuthed) {
    return <Redirect href={(buildProtectedLoginRedirect("/wallet") ?? "/login") as never} />;
  }

  return <CustomerWalletScreen />;
}
