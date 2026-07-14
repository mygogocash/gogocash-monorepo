import { EventEmitter } from 'node:events';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import {
  fetchGoLinkPreview,
  requestPinnedHttps,
  type GoLinkPreviewNetwork,
  type GoLinkPreviewNetworkResponse,
} from './golink-preview.service';

jest.mock('node:https', () => ({ request: jest.fn() }));

const mockedHttpsRequest = jest.mocked(httpsRequest);

const EMPTY_PREVIEW = {
  title: null,
  imageUrl: null,
  description: null,
  price: null,
};

function response(
  statusCode: number,
  options: {
    location?: string;
    chunks?: Uint8Array[];
    contentLength?: string;
  } = {},
): GoLinkPreviewNetworkResponse & { dispose: jest.Mock } {
  const dispose = jest.fn();
  return {
    statusCode,
    headers: {
      location: options.location,
      'content-length': options.contentLength,
    },
    body: (async function* () {
      for (const chunk of options.chunks ?? []) {
        yield chunk;
      }
    })(),
    dispose,
  };
}

function network(
  options: {
    addresses?: Record<string, Array<{ address: string; family: 4 | 6 }>>;
    responses?: GoLinkPreviewNetworkResponse[];
  } = {},
) {
  const responses = [...(options.responses ?? [])];
  const resolve = jest.fn(async (hostname: string) =>
    options.addresses?.[hostname]
      ? [...options.addresses[hostname]]
      : [{ address: '93.184.216.34', family: 4 as const }],
  );
  const request = jest.fn(async () => {
    const next = responses.shift();
    if (!next) {
      throw new Error('Unexpected preview request');
    }
    return next;
  });
  return { resolve, request } satisfies GoLinkPreviewNetwork;
}

describe('fetchGoLinkPreview', () => {
  afterEach(() => {
    jest.useRealTimers();
    mockedHttpsRequest.mockReset();
  });

  it('returns the empty response shape for a rejected URL without resolving it', async () => {
    const previewNetwork = network();

    await expect(
      fetchGoLinkPreview('http://shopee.co.th/item/1', previewNetwork),
    ).resolves.toEqual(EMPTY_PREVIEW);
    expect(previewNetwork.resolve).not.toHaveBeenCalled();
    expect(previewNetwork.request).not.toHaveBeenCalled();
  });

  it('resolves, pins, and streams a legitimate marketplace preview', async () => {
    const html = Buffer.from(
      '<meta property="og:title" content="Shopee deal" />',
    );
    const success = response(200, { chunks: [html] });
    const previewNetwork = network({
      addresses: {
        's.shopee.co.th': [
          { address: '93.184.216.34', family: 4 },
          { address: '2606:4700:4700::1111', family: 6 },
        ],
      },
      responses: [success],
    });

    await expect(
      fetchGoLinkPreview('https://s.shopee.co.th/product/1', previewNetwork),
    ).resolves.toEqual({
      title: 'Shopee deal',
      imageUrl: null,
      description: null,
      price: null,
    });
    expect(previewNetwork.resolve).toHaveBeenCalledWith('s.shopee.co.th');
    expect(previewNetwork.request).toHaveBeenCalledWith(
      expect.objectContaining({ hostname: 's.shopee.co.th' }),
      { address: '93.184.216.34', family: 4 },
      expect.any(AbortSignal),
    );
  });

  it('rejects a DNS answer set when any address is unsafe', async () => {
    const previewNetwork = network({
      addresses: {
        's.shopee.co.th': [
          { address: '93.184.216.34', family: 4 },
          { address: '169.254.169.254', family: 4 },
        ],
      },
    });

    await expect(
      fetchGoLinkPreview('https://s.shopee.co.th/product/1', previewNetwork),
    ).resolves.toEqual(EMPTY_PREVIEW);
    expect(previewNetwork.request).not.toHaveBeenCalled();
  });

  it('revalidates and pins every safe redirect before requesting it', async () => {
    const redirect = response(302, {
      location: 'https://www.lazada.co.th/item/2',
    });
    const success = response(200, {
      chunks: [
        Buffer.from('<meta property="og:title" content="Lazada deal" />'),
      ],
    });
    const previewNetwork = network({ responses: [redirect, success] });

    await expect(
      fetchGoLinkPreview('https://s.shopee.co.th/item/1', previewNetwork),
    ).resolves.toEqual(expect.objectContaining({ title: 'Lazada deal' }));
    expect(previewNetwork.resolve).toHaveBeenNthCalledWith(1, 's.shopee.co.th');
    expect(previewNetwork.resolve).toHaveBeenNthCalledWith(
      2,
      'www.lazada.co.th',
    );
    expect(previewNetwork.request).toHaveBeenCalledTimes(2);
    expect(redirect.dispose).toHaveBeenCalledTimes(1);
  });

  it.each([
    'http://shopee.co.th/private',
    'https://169.254.169.254/latest/meta-data',
    'https://shopee.co.th.evil.example/private',
    'https://user:password@shopee.co.th/private',
  ])('does not request an unsafe redirect target %s', async (location) => {
    const redirect = response(302, { location });
    const previewNetwork = network({ responses: [redirect] });

    await expect(
      fetchGoLinkPreview('https://s.shopee.co.th/item/1', previewNetwork),
    ).resolves.toEqual(EMPTY_PREVIEW);
    expect(previewNetwork.request).toHaveBeenCalledTimes(1);
  });

  it('rejects an unsafe DNS result introduced by a redirect', async () => {
    const previewNetwork = network({
      addresses: {
        's.shopee.co.th': [{ address: '93.184.216.34', family: 4 }],
        'www.lazada.co.th': [{ address: '::1', family: 6 }],
      },
      responses: [
        response(302, { location: 'https://www.lazada.co.th/item/2' }),
      ],
    });

    await expect(
      fetchGoLinkPreview('https://s.shopee.co.th/item/1', previewNetwork),
    ).resolves.toEqual(EMPTY_PREVIEW);
    expect(previewNetwork.request).toHaveBeenCalledTimes(1);
  });

  it('rejects redirect loops before repeating a request', async () => {
    const previewNetwork = network({
      responses: [
        response(302, { location: '/item/2' }),
        response(302, { location: '/item/1' }),
      ],
    });

    await expect(
      fetchGoLinkPreview('https://s.shopee.co.th/item/1', previewNetwork),
    ).resolves.toEqual(EMPTY_PREVIEW);
    expect(previewNetwork.request).toHaveBeenCalledTimes(2);
  });

  it('rejects more than five redirects', async () => {
    const previewNetwork = network({
      responses: Array.from({ length: 6 }, (_, index) =>
        response(302, { location: `/item/${index + 2}` }),
      ),
    });

    await expect(
      fetchGoLinkPreview('https://s.shopee.co.th/item/1', previewNetwork),
    ).resolves.toEqual(EMPTY_PREVIEW);
    expect(previewNetwork.request).toHaveBeenCalledTimes(6);
  });

  it('stops streaming without retaining bytes beyond 512 KiB', async () => {
    const oversized = response(200, {
      chunks: [Buffer.alloc(512 * 1024), Buffer.from('x')],
    });
    const previewNetwork = network({ responses: [oversized] });

    await expect(
      fetchGoLinkPreview('https://s.shopee.co.th/item/1', previewNetwork),
    ).resolves.toEqual(EMPTY_PREVIEW);
    expect(oversized.dispose).toHaveBeenCalledTimes(1);
  });

  it('rejects a declared body larger than 512 KiB before reading it', async () => {
    const oversized = response(200, {
      contentLength: String(512 * 1024 + 1),
      chunks: [Buffer.from('must not be consumed')],
    });
    const previewNetwork = network({ responses: [oversized] });

    await expect(
      fetchGoLinkPreview('https://s.shopee.co.th/item/1', previewNetwork),
    ).resolves.toEqual(EMPTY_PREVIEW);
    expect(oversized.dispose).toHaveBeenCalledTimes(1);
  });

  it('aborts a stalled DNS resolution after the shared five-second budget', async () => {
    jest.useFakeTimers();
    const previewNetwork: GoLinkPreviewNetwork = {
      resolve: jest.fn(() => new Promise(() => undefined)),
      request: jest.fn(),
    };

    const pending = fetchGoLinkPreview(
      'https://s.shopee.co.th/item/1',
      previewNetwork,
    );
    const rejection = expect(pending).rejects.toThrow();
    await jest.advanceTimersByTimeAsync(5_000);

    await rejection;
    expect(previewNetwork.request).not.toHaveBeenCalled();
  });
});

describe('requestPinnedHttps', () => {
  it('connects only to the approved address while preserving Host and TLS SNI', async () => {
    const responseStream = Object.assign(Readable.from([]), {
      statusCode: 200,
      headers: {},
    });
    const request = Object.assign(new EventEmitter(), { end: jest.fn() });
    mockedHttpsRequest.mockImplementation(((_url, _options, callback) => {
      callback?.(responseStream as never);
      return request;
    }) as unknown as typeof httpsRequest);

    await requestPinnedHttps(
      new URL('https://s.shopee.co.th/item/1'),
      { address: '93.184.216.34', family: 4 },
      new AbortController().signal,
    );

    const [requestedUrl, options] = mockedHttpsRequest.mock.calls[0];
    expect(requestedUrl).toEqual(new URL('https://s.shopee.co.th/item/1'));
    expect(options).toEqual(
      expect.objectContaining({
        agent: false,
        family: 4,
        servername: 's.shopee.co.th',
      }),
    );
    const lookup = options?.lookup;
    expect(lookup).toEqual(expect.any(Function));
    const callback = jest.fn();
    lookup?.('s.shopee.co.th', { family: 4, all: false }, callback);
    expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    expect(request.end).toHaveBeenCalledTimes(1);
  });
});
