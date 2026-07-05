import { Redirect } from "expo-router";

import { buildProtectedLoginRedirect } from "@mobile/auth/routeGuard";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerWalletScreen } from "@mobile/screens/CustomerWalletScreen";

export default function WalletRoute() {
  const { isAuthed, ready } = useAuthGuardSession();

  // `/wallet` self-guards like the profile tab: keep the route in the root stack
  // for unauthenticated users so `<Redirect>` can land on `/login?callbackUrl=/wallet`
  // instead of expo-router falling back to home when the screen is Stack.Protected-only.
  if (!ready) {
    return null;
  }

  if (!isAuthed) {
    return <Redirect href={(buildProtectedLoginRedirect("/wallet") ?? "/login") as never} />;
  }

  return <CustomerWalletScreen />;
}
