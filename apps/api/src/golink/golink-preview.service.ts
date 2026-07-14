import { Injectable, Logger } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import {
  extractOpenGraphPreview,
  isPublicGoLinkPreviewAddress,
  parseGoLinkPreviewUrl,
  type GoLinkOpenGraphPreview,
} from 'src/golink/golink-preview.util';

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BODY_BYTES = 512 * 1024;
const MAX_REDIRECTS = 5;

const EMPTY_PREVIEW: GoLinkOpenGraphPreview = {
  title: null,
  imageUrl: null,
  description: null,
  price: null,
};

export type GoLinkPreviewResolvedAddress = {
  address: string;
  family: 4 | 6;
};

export type GoLinkPreviewNetworkResponse = {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: AsyncIterable<Uint8Array>;
  dispose: () => void;
};

export type GoLinkPreviewNetwork = {
  resolve: (hostname: string) => Promise<GoLinkPreviewResolvedAddress[]>;
  request: (
    url: URL,
    address: GoLinkPreviewResolvedAddress,
    signal: AbortSignal,
  ) => Promise<GoLinkPreviewNetworkResponse>;
};

async function resolveHost(
  hostname: string,
): Promise<GoLinkPreviewResolvedAddress[]> {
  const answers = await lookup(hostname, { all: true, verbatim: true });
  return answers
    .filter(
      (answer): answer is GoLinkPreviewResolvedAddress =>
        answer.family === 4 || answer.family === 6,
    )
    .map(({ address, family }) => ({ address, family }));
}

export function requestPinnedHttps(
  url: URL,
  address: GoLinkPreviewResolvedAddress,
  signal: AbortSignal,
): Promise<GoLinkPreviewNetworkResponse> {
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [address]);
      return;
    }
    callback(null, address.address, address.family);
  };
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        agent: false,
        family: address.family,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'GoGoCash-GoLinkPreview/1.0',
        },
        lookup: pinnedLookup,
        maxHeaderSize: 16 * 1024,
        method: 'GET',
        servername: url.hostname,
        signal,
      },
      (response) => {
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          body: response,
          dispose: () => {
            response.destroy();
          },
        });
      },
    );
    request.once('error', reject);
    request.end();
  });
}

const DEFAULT_NETWORK: GoLinkPreviewNetwork = {
  resolve: resolveHost,
  request: requestPinnedHttps,
};

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('GoLink preview timed out');
}

function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(abortError(signal));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

function headerValue(
  headers: GoLinkPreviewNetworkResponse['headers'],
  name: string,
): string | null {
  const value = headers[name];
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value) && value.length === 1 ? value[0] : null;
}

function validatedAddress(
  answers: readonly GoLinkPreviewResolvedAddress[],
): GoLinkPreviewResolvedAddress | null {
  if (
    answers.length === 0 ||
    answers.some(
      ({ address, family }) =>
        isIP(address) !== family || !isPublicGoLinkPreviewAddress(address),
    )
  ) {
    return null;
  }
  return answers[0];
}

async function readLimitedBody(
  body: AsyncIterable<Uint8Array>,
): Promise<Buffer | null> {
  const buffer = Buffer.alloc(MAX_BODY_BYTES);
  let byteLength = 0;
  for await (const value of body) {
    if (byteLength + value.byteLength > MAX_BODY_BYTES) {
      return null;
    }
    buffer.set(value, byteLength);
    byteLength += value.byteLength;
  }
  return buffer.subarray(0, byteLength);
}

/**
 * Fetch a preview through a DNS-pinned, redirect-by-redirect SSRF boundary.
 * The network seam keeps security regression tests deterministic and offline.
 */
export async function fetchGoLinkPreview(
  input: string,
  network: GoLinkPreviewNetwork = DEFAULT_NETWORK,
): Promise<GoLinkOpenGraphPreview> {
  const initialUrl = parseGoLinkPreviewUrl(input);
  if (!initialUrl) {
    return EMPTY_PREVIEW;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  timer.unref?.();
  const visited = new Set<string>();
  let currentUrl = initialUrl;
  let redirectCount = 0;

  try {
    while (true) {
      const currentKey = currentUrl.toString();
      if (visited.has(currentKey)) {
        return EMPTY_PREVIEW;
      }
      visited.add(currentKey);

      const answers = await raceWithAbort(
        network.resolve(currentUrl.hostname),
        controller.signal,
      );
      const address = validatedAddress(answers);
      if (!address) {
        return EMPTY_PREVIEW;
      }

      const response = await raceWithAbort(
        network.request(currentUrl, address, controller.signal),
        controller.signal,
      );

      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const location = headerValue(response.headers, 'location');
        response.dispose();
        if (!location || redirectCount >= MAX_REDIRECTS) {
          return EMPTY_PREVIEW;
        }

        let nextUrl: URL;
        try {
          nextUrl = new URL(location, currentUrl);
        } catch {
          return EMPTY_PREVIEW;
        }
        const validatedNextUrl = parseGoLinkPreviewUrl(nextUrl.toString());
        if (!validatedNextUrl) {
          return EMPTY_PREVIEW;
        }
        currentUrl = validatedNextUrl;
        redirectCount += 1;
        continue;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.dispose();
        return EMPTY_PREVIEW;
      }

      const contentLength = headerValue(response.headers, 'content-length');
      if (
        contentLength !== null &&
        (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)
      ) {
        response.dispose();
        return EMPTY_PREVIEW;
      }

      let buffer: Buffer | null;
      try {
        buffer = await raceWithAbort(
          readLimitedBody(response.body),
          controller.signal,
        );
      } finally {
        response.dispose();
      }
      if (!buffer) {
        return EMPTY_PREVIEW;
      }

      return extractOpenGraphPreview(buffer.toString('utf8'));
    }
  } finally {
    clearTimeout(timer);
  }
}

@Injectable()
export class GolinkPreviewService {
  private readonly logger = new Logger(GolinkPreviewService.name);

  async preview(url: string): Promise<GoLinkOpenGraphPreview> {
    try {
      return await fetchGoLinkPreview(url);
    } catch (error) {
      const hostname = parseGoLinkPreviewUrl(url)?.hostname ?? 'invalid-url';
      const errorName =
        error instanceof Error && /^[A-Za-z][A-Za-z0-9]*$/.test(error.name)
          ? error.name
          : 'UnknownError';
      const rawCode =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code?: unknown }).code
          : undefined;
      const errorCode =
        typeof rawCode === 'string' && /^[A-Z0-9_]+$/.test(rawCode)
          ? `/${rawCode}`
          : '';
      this.logger.warn(
        `GoLink preview failed for ${hostname}: ${errorName}${errorCode}`,
      );
      return EMPTY_PREVIEW;
    }
  }
}
