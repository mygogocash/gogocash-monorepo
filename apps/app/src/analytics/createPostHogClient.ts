import { PostHog } from "posthog-react-native";

/**
 * No-op PostHog client used when analytics is unconfigured OR when the real
 * client cannot initialize. Mounted through <PostHogProvider client=...> so
 * usePostHog() always resolves a client from context (otherwise
 * posthog-react-native console.error()s once per caller). capture/identify/
 * reset are present so every consumer no-ops cleanly.
 */
export const noOpPostHogClient = {
  capture: () => undefined,
  identify: () => undefined,
  reset: () => undefined,
  screen: () => undefined,
  debug: () => undefined,
  flush: () => undefined,
  optIn: () => undefined,
  optOut: () => undefined,
} as unknown as PostHog;

export type PostHogClientConfig = {
  posthogKey?: string;
  posthogHost?: string;
};

/**
 * Analytics must NEVER take the app down. posthog-react-native's constructor
 * throws synchronously when no storage module is available (e.g. web builds
 * without @react-native-async-storage/async-storage installed) — this took
 * beta.gogocash.co down to a blank screen on 2026-07-19. Construction is
 * therefore fenced here: any init failure degrades to the no-op client.
 */
export function createPostHogClient(
  config: PostHogClientConfig | null | undefined,
): PostHog {
  if (!config?.posthogKey) {
    return noOpPostHogClient;
  }
  try {
    return new PostHog(config.posthogKey, {
      host: config.posthogHost || undefined,
    });
  } catch (error) {
    console.warn(
      "[analytics] PostHog init failed — analytics disabled for this session",
      error,
    );
    return noOpPostHogClient;
  }
}
