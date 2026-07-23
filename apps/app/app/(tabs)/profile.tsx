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

  // While the native session is still hydrating, show a neutral loading state — never the
  // "Sign in required" card (a logged-in user would see a false auth-failure flash on cold
  // start) and never a blank tab (the original Android logged-out bottom-nav dead end).
  if (!ready) {
    return <CustomerRouteState testID="profile-loading" variant="loading" />;
  }

  if (!isAuthed) {
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
