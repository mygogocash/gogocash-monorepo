import type { ReactNode } from "react";

// Test stub for expo-router used ONLY by the render-test config
// (vitest.render.config.ts aliases "expo-router" here). The real module ships a
// native router that resolves to a non-component object under happy-dom, which
// breaks React rendering. This stub provides component/hook shapes faithful
// enough to mount screens: Link/navigators render their children; hooks return
// inert values. It is never bundled into the app.

type Children = { children?: ReactNode };

export function Link({ children }: { href?: unknown; asChild?: boolean } & Children) {
  return <>{children}</>;
}

export function Redirect(_props: { href?: unknown }) {
  return null;
}

export function Stack({ children }: Children) {
  return <>{children}</>;
}
Stack.Screen = function StackScreen(_props: Record<string, unknown>) {
  return null;
};

export function Tabs({ children }: Children) {
  return <>{children}</>;
}
Tabs.Screen = function TabsScreen(_props: Record<string, unknown>) {
  return null;
};

export function Slot({ children }: Children) {
  return <>{children}</>;
}

const noop = () => undefined;

export const router = {
  push: noop,
  replace: noop,
  back: noop,
  navigate: noop,
  setParams: noop,
  canGoBack: () => false,
};

export const useRouter = () => router;
export const usePathname = () => "/";
export const useSegments = () => [] as string[];
export const useLocalSearchParams = () => ({}) as Record<string, string>;
export const useGlobalSearchParams = () => ({}) as Record<string, string>;
export const useNavigation = () => ({ navigate: noop, goBack: noop, setOptions: noop });
export const useFocusEffect = noop;
