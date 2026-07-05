import { useRouter } from "expo-router";
import { useEffect } from "react";

import { buildProtectedLoginRedirect } from "@mobile/auth/routeGuard";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerProfileScreen } from "@mobile/screens/CustomerProfileScreen";

export default function ProfileRoute() {
  const router = useRouter();
  const { isAuthed, ready } = useAuthGuardSession();
  const loginHref = buildProtectedLoginRedirect("/profile") ?? "/login";

  // `/profile` lives inside `(tabs)`. `<Redirect>` cannot push the root-stack
  // `/login` screen from a tab scene on native (blank tab). `router.replace`
  // targets the root navigator, same pattern as logout in `useMobileLogout`.
  useEffect(() => {
    if (ready && !isAuthed) {
      router.replace(loginHref as never);
    }
  }, [ready, isAuthed, loginHref, router]);

  if (!ready || !isAuthed) {
    return null;
  }

  return <CustomerProfileScreen />;
}
