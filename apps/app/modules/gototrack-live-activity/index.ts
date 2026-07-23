import { requireOptionalNativeModule } from "expo";

export type GototrackLiveActivityPayload = {
  merchantName: string;
  merchantId: string;
  detectionEventId?: string;
  offerId: number;
  networkMerchantId: number;
  packageName?: string;
};

export interface GototrackLiveActivityModule {
  startActivationPrompt(payload: GototrackLiveActivityPayload): Promise<void>;
  endActivationPrompt(): Promise<void>;
  updateActivationPrompt(payload: GototrackLiveActivityPayload): Promise<void>;
}

export function loadGototrackLiveActivityModule(): GototrackLiveActivityModule | null {
  return requireOptionalNativeModule<GototrackLiveActivityModule>(
    "GototrackLiveActivity",
  );
}
