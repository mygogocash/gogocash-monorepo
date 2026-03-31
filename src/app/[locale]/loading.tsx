import { NavigationLoadingTrigger } from "@/components/providers/NavigationLoadingOverlay";

/**
 * Arms the navigation loading overlay (min 3s) in `NavigationLoadingProvider`.
 * Visual loader is rendered by the provider so it can stay on screen after this unmounts.
 */
export default function Loading() {
  return <NavigationLoadingTrigger />;
}
