export type GototrackMcpConfig = {
  apiUrl: string;
  authToken?: string;
};

export type MatchMerchantInput = {
  merchantHint?: string;
  url?: string;
  packageName?: string;
  platform?: 'android' | 'ios' | 'web' | 'line';
  conversationId?: string;
};

export type ActivateCashbackInput = {
  detectionEventId: string;
  merchantId: string;
  offerId: number;
  networkMerchantId: number;
  merchantName?: string;
  packageName?: string;
  conversationId?: string;
};

function buildHeaders(authToken: string | undefined, withAuth: boolean) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (withAuth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} failed (${response.status}): ${body.slice(0, 240)}`);
  }
  return (await response.json()) as T;
}

export function createGototrackClient(config: GototrackMcpConfig) {
  const baseUrl = config.apiUrl.replace(/\/$/, '');

  return {
    async searchMerchants(query?: string) {
      const trimmed = query?.trim();
      const params = trimmed ? `?q=${encodeURIComponent(trimmed)}` : '';
      const response = await fetch(
        `${baseUrl}/agent/v1/gototrack/merchants/search${params}`,
        { headers: buildHeaders(config.authToken, false) },
      );
      return readJson(response, 'searchMerchants');
    },

    async matchMerchant(input: MatchMerchantInput) {
      const response = await fetch(
        `${baseUrl}/agent/v1/gototrack/match-merchant`,
        {
          method: 'POST',
          headers: buildHeaders(config.authToken, true),
          body: JSON.stringify(input),
        },
      );
      return readJson(response, 'matchMerchant');
    },

    async activateCashback(input: ActivateCashbackInput) {
      const response = await fetch(
        `${baseUrl}/agent/v1/gototrack/activate-cashback`,
        {
          method: 'POST',
          headers: buildHeaders(config.authToken, true),
          body: JSON.stringify(input),
        },
      );
      return readJson(response, 'activateCashback');
    },

    async getTimeline() {
      const response = await fetch(`${baseUrl}/agent/v1/gototrack/timeline`, {
        headers: buildHeaders(config.authToken, true),
      });
      return readJson(response, 'getTimeline');
    },
  };
}

export function resolveGototrackMcpConfig(
  env: NodeJS.ProcessEnv = process.env,
): GototrackMcpConfig {
  const apiUrl =
    env.GOGOCASH_API_URL?.trim() ||
    env.EXPO_PUBLIC_API_URL?.trim() ||
    'https://api.dev.gogocash.co';
  const authToken =
    env.GOGOTRACK_AUTH_TOKEN?.trim() ||
    env.GOTOTRACK_AUTH_TOKEN?.trim() ||
    env.GOGOSENSE_AUTH_TOKEN?.trim();

  return { apiUrl, authToken };
}
