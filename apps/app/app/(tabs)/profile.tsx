import { Redirect } from "expo-router";

import { buildProtectedLoginRedirect } from "@mobile/auth/routeGuard";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerProfileScreen } from "@mobile/screens/CustomerProfileScreen";

export default function ProfileRoute() {
  const { isAuthed, ready } = useAuthGuardSession();

  // `/profile` is a protected tab. `Tabs.Protected` can only fall back to a sibling
  // tab (home), so to keep unauthenticated access consistent with the top-level
  // protected routes (which redirect to /login via `Stack.Protected`), the tab
  // self-guards here. Wait for the one-time session read (`ready`) before redirecting
  // so an authenticated user is never bounced mid-bootstrap.
  if (!ready) {
    return null;
  }

  if (!isAuthed) {
    return <Redirect href={(buildProtectedLoginRedirect("/profile") ?? "/login") as never} />;
  }

  return <CustomerProfileScreen />;
}
