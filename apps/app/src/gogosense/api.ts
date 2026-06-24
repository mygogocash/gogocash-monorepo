export type DetectionMethod =
  | "android_package"
  | "browser_url"
  | "notification"
  | "screenshot_ocr"
  | "manual";

export type GoGoSensePlatform = "android" | "ios" | "web" | "line";

export type GoGoSenseDetectionRequest = {
  method: DetectionMethod;
  packageName?: string;
  url?: string;
  notificationText?: string;
  screenshotJobId?: string;
  observedAt: string;
  platform: GoGoSensePlatform;
  appVersion?: string;
};

export type GoGoSenseDetectionResponse = {
  detectionEventId?: string;
  matched: boolean;
  merchantId?: string;
  merchantName?: string;
  brandSlug?: string;
  offerId?: number;
  networkMerchantId?: number;
  cashbackRate?: string;
  confidenceScore?: number;
  recommendedAction?: "activate" | "ignore" | "manual_review";
};

export type GoGoSenseActivationRequest = {
  detectionEventId?: string;
  merchantId: string;
  offerId: number;
  networkMerchantId: number;
  source: "gogosense" | "golink" | "shop_detail" | "line";
};

export type GoGoSenseActivationResponse = {
  activationEventId: string;
  deeplink: string;
  expiresAt?: string;
};

export type GoGoSenseSettingsUpdate = {
  enabled?: boolean;
  usageStatsEnabled?: boolean;
  notificationListenerEnabled?: boolean;
  screenshotRecoveryEnabled?: boolean;
};

export type GoGoSenseBaseClient = {
  get<TResponse = unknown>(path: string): Promise<TResponse>;
  post<TResponse = unknown>(path: string, body?: unknown): Promise<TResponse>;
};

const sanitizeDetectionUrl = (url?: string) => {
  if (!url) return undefined;

  const match = url.trim().match(/^(https?:\/\/)?([^/?#\s]+)(?:[/?#].*)?$/i);
  if (!match) return undefined;

  const protocol = match[1]?.toLowerCase() || "https://";
  return `${protocol}${match[2].toLowerCase()}`;
};

const sanitizeDetectionText = (text?: string) => {
  if (!text) return undefined;

  const sanitized = text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b\d{8,}\b/g, "[redacted-number]")
    .replace(/\+?\b(?:\d[\d\s().-]{7,}\d)\b/g, "[redacted-phone]")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized ? sanitized.slice(0, 240) : undefined;
};

const sanitizeDetectionRequest = (
  request: GoGoSenseDetectionRequest,
): GoGoSenseDetectionRequest => ({
  ...request,
  url: sanitizeDetectionUrl(request.url),
  notificationText: sanitizeDetectionText(request.notificationText),
});

export function createGoGoSenseApi(client: GoGoSenseBaseClient) {
  return {
    getMerchants() {
      return client.get("/gogosense/merchants");
    },
    detect(request: GoGoSenseDetectionRequest) {
      return client.post<GoGoSenseDetectionResponse>(
        "/gogosense/detect",
        sanitizeDetectionRequest(request),
      );
    },
    activate(request: GoGoSenseActivationRequest) {
      return client.post<GoGoSenseActivationResponse>(
        "/gogosense/activate",
        request,
      );
    },
    getTimeline() {
      return client.get("/gogosense/timeline");
    },
    createScreenshotJob() {
      return client.post("/gogosense/screenshot");
    },
    getScreenshotJob(id: string) {
      return client.get(`/gogosense/screenshot/${id}`);
    },
    getSettings() {
      return client.get("/gogosense/settings");
    },
    updateSettings(settings: GoGoSenseSettingsUpdate) {
      return client.post("/gogosense/settings", settings);
    },
  };
}
