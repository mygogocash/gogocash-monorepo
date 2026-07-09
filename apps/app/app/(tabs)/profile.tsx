import { useRouter } from "expo-router";
import { useEffect } from "react";
import { InteractionManager } from "react-native";

import { buildProtectedLoginRedirect } from "@mobile/auth/routeGuard";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { CustomerProfileScreen } from "@mobile/screens/CustomerProfileScreen";

export default function ProfileRoute() {
  const router = useRouter();
  const { isAuthed, ready } = useAuthGuardSession();
  const loginHref = buildProtectedLoginRedirect("/profile") ?? "/login";

  // `/profile` lives inside `(tabs)`. `<Redirect>` cannot push the root-stack
  // `/login` screen from a tab scene on native (blank tab). `router.replace`
  // targets the root navigator, same pattern as logout in `useMobileLogout`.
  useEffect(() => {
    if (!ready || isAuthed) {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      router.replace(loginHref as never);
    });

    return () => task.cancel();
  }, [ready, isAuthed, loginHref, router]);

  if (!ready || !isAuthed) {
    // Never paint a blank tab while the root login redirect settles — that was
    // the Android logged-out Profile bottom-nav failure mode.
    return (
      <CustomerRouteState
        action={{
          href: loginHref,
          label: "Sign in",
        }}
        testID="profile-auth-guard"
        title="Sign in required"
        variant="unauthenticated"
      />
    );
  }

  return <CustomerProfileScreen />;
}
