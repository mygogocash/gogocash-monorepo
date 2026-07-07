import type {
  GoGoTrackActivationRequest,
  GoGoTrackActivationResponse,
} from "./api";
import {
  resolveGoGoTrackActivationKey,
  runExclusiveGoGoTrackActivation,
} from "./activationMutex";

export type GoGoTrackPromptPayload = {
  packageName?: string;
  detectionEventId?: string;
  merchantId: string;
  merchantName?: string;
  offerId: number;
  networkMerchantId: number;
};

export type GoGoTrackPromptCoordinatorState = {
  nativePromptActive: boolean;
  activePayload: GoGoTrackPromptPayload | null;
};

type PromptCoordinatorApi = {
  activate(
    request: GoGoTrackActivationRequest,
  ): Promise<GoGoTrackActivationResponse>;
};

export type GoGoTrackPromptCoordinatorOptions = {
  api: PromptCoordinatorApi;
  cooldownMs?: number;
  now?: () => Date;
  onChange?: () => void;
  openUrl?: (url: string) => void | Promise<void>;
};

const defaultCooldownMs = 5 * 60 * 1000;

function promptKey(payload: GoGoTrackPromptPayload): string {
  return `${payload.packageName ?? "unknown"}:${payload.detectionEventId ?? payload.merchantId}`;
}

/**
 * Shared orchestrator for Android notification / iOS Live Activity activation
 * prompts. Dedupes matches, enforces cooldown, and reuses the same activate →
 * deeplink path as the hub banner (with `gototrack_background_prompt` source).
 */
export function createGoGoTrackPromptCoordinator(
  options: GoGoTrackPromptCoordinatorOptions,
) {
  const now = options.now ?? (() => new Date());
  const cooldownMs = options.cooldownMs ?? defaultCooldownMs;
  const lastPromptAtByKey = new Map<string, number>();
  const dismissedPromptKeys = new Set<string>();
  const listeners = new Set<() => void>();
  let activePromptKey: string | null = null;
  let activePayload: GoGoTrackPromptPayload | null = null;

  const emitChange = () => {
    options.onChange?.();
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getState(): GoGoTrackPromptCoordinatorState {
      return {
        nativePromptActive: activePromptKey != null,
        activePayload,
      };
    },

    shouldSuppressBanner(_matchKey: string | null): boolean {
      return activePromptKey != null;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    showNativePrompt(payload: GoGoTrackPromptPayload): boolean {
      const key = promptKey(payload);
      const observedAt = now().getTime();
      const lastAt = lastPromptAtByKey.get(key);
      if (lastAt !== undefined && observedAt - lastAt < cooldownMs) {
        return false;
      }

      lastPromptAtByKey.set(key, observedAt);
      dismissedPromptKeys.delete(key);
      activePromptKey = key;
      activePayload = payload;
      emitChange();
      return true;
    },

    dismissFromNative(payload?: GoGoTrackPromptPayload): void {
      if (payload != null) {
        const key = promptKey(payload);
        if (activePromptKey != null && activePromptKey !== key) {
          return;
        }
        dismissedPromptKeys.add(key);
      }
      activePromptKey = null;
      activePayload = null;
      emitChange();
    },

    async activateFromNative(
      payload: GoGoTrackPromptPayload,
    ): Promise<{ deeplink: string } | null> {
      const key = promptKey(payload);
      if (activePromptKey != null && activePromptKey !== key) {
        return null;
      }
      if (activePromptKey == null) {
        if (dismissedPromptKeys.has(key)) {
          return null;
        }
        if (!lastPromptAtByKey.has(key)) {
          return null;
        }
      }

      return runExclusiveGoGoTrackActivation(
        resolveGoGoTrackActivationKey({
          detectionEventId: payload.detectionEventId,
          merchantId: payload.merchantId,
          offerId: payload.offerId,
          networkMerchantId: payload.networkMerchantId,
        }),
        async () => {
          const result = await options.api.activate({
            detectionEventId: payload.detectionEventId,
            merchantId: payload.merchantId,
            offerId: payload.offerId,
            networkMerchantId: payload.networkMerchantId,
            source: "gototrack_background_prompt",
          });
          activePromptKey = null;
          activePayload = null;
          dismissedPromptKeys.delete(key);
          emitChange();
          await options.openUrl?.(result.deeplink);
          return { deeplink: result.deeplink };
        },
      );
    },
  };
}

export type GoGoTrackPromptCoordinator = ReturnType<
  typeof createGoGoTrackPromptCoordinator
>;
