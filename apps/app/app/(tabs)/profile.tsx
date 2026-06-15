import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";
import { CustomerProfileScreen } from "@mobile/screens/CustomerProfileScreen";

export default function ProfileRoute() {
  const { isAuthed, ready } = useAuthGuardSession();

  // `/profile` is a protected tab. For logged-out users we render the login UI
  // INLINE (within the Tabs navigator) instead of `<Redirect>`-ing to the root
  // `/login` route. The cross-navigator Tabs→/login transition crashes the New-Arch
  // Android view mounter on a cold start: react-native-screens@4.25.2 leaks a child
  // View's mParent during the screen-removal animation, so RN-core's
  // ReactClippingViewManager.addView later throws "child already has a parent" (only
  // /profile crashes — non-redirecting tab navigations are fine). Keeping login inside
  // the Tabs navigator removes that transition entirely (verified 0/3 cold-launch
  // crashes on device); after a successful login `isAuthed` flips and the tab
  // re-renders to the profile hub. Wait for the one-time (async on native) session
  // read before deciding so an authenticated user never flashes the login screen.
  if (!ready) {
    return null;
  }

  if (!isAuthed) {
    return <CustomerAuthScreen mode="login" />;
  }

  return <CustomerProfileScreen />;
}
