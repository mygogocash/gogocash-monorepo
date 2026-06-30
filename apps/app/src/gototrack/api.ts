export type DetectionMethod =
  | "android_package"
  | "browser_url"
  | "notification"
  | "screenshot_ocr"
  | "manual";

export type GoGoTrackPlatform = "android" | "ios" | "web" | "line";

export type GoGoTrackDetectionRequest = {
  method: DetectionMethod;
  packageName?: string;
  url?: string;
  notificationText?: string;
  screenshotJobId?: string;
  observedAt: string;
  platform: GoGoTrackPlatform;
  appVersion?: string;
};

export type GoGoTrackDetectionResponse = {
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

export type GoGoTrackActivationRequest = {
  detectionEventId?: string;
  merchantId: string;
  offerId: number;
  networkMerchantId: number;
  source:
    | "gototrack"
    | "gototrack_background_prompt"
    | "golink"
    | "shop_detail"
    | "line";
};

export type GoGoTrackActivationResponse = {
  activationEventId: string;
  deeplink: string;
  expiresAt?: string;
};

export type GoGoTrackSettingsUpdate = {
  enabled?: boolean;
  usageStatsEnabled?: boolean;
  notificationListenerEnabled?: boolean;
  screenshotRecoveryEnabled?: boolean;
  backgroundPromptsEnabled?: boolean;
};

export type GoGoTrackBaseClient = {
  get<TResponse = unknown>(path: string): Promise<TResponse>;
  post<TResponse = unknown>(path: string, body?: unknown): Promise<TResponse>;
};

const sanitizeDetectionUrl = (url?: string) => {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) return undefined;

  const candidate = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

  try {
    const parsedUrl = new URL(candidate);
    if (!["http:", "https:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
      return undefined;
    }

    return parsedUrl.origin.toLowerCase();
  } catch {
    return undefined;
  }
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
  request: GoGoTrackDetectionRequest,
): GoGoTrackDetectionRequest => ({
  ...request,
  url: sanitizeDetectionUrl(request.url),
  notificationText: sanitizeDetectionText(request.notificationText),
});

export function createGoGoTrackApi(client: GoGoTrackBaseClient) {
  return {
    getMerchants() {
      return client.get("/gototrack/merchants");
    },
    detect(request: GoGoTrackDetectionRequest) {
      return client.post<GoGoTrackDetectionResponse>(
        "/gototrack/detect",
        sanitizeDetectionRequest(request),
      );
    },
    activate(request: GoGoTrackActivationRequest) {
      return client.post<GoGoTrackActivationResponse>(
        "/gototrack/activate",
        request,
      );
    },
    getTimeline() {
      return client.get("/gototrack/timeline");
    },
    createScreenshotJob() {
      return client.post("/gototrack/screenshot");
    },
    getScreenshotJob(id: string) {
      return client.get(`/gototrack/screenshot/${id}`);
    },
    getSettings() {
      return client.get("/gototrack/settings");
    },
    updateSettings(settings: GoGoTrackSettingsUpdate) {
      return client.post("/gototrack/settings", settings);
    },
  };
}
