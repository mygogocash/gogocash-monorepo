import {
  extractOpenGraphPreview,
  isAllowedGoLinkPreviewHost,
  isPublicGoLinkPreviewAddress,
  parseGoLinkPreviewUrl,
} from './golink-preview.util';

describe('isAllowedGoLinkPreviewHost', () => {
  it('allows known marketplace hosts', () => {
    expect(isAllowedGoLinkPreviewHost('shopee.co.th')).toBe(true);
    expect(isAllowedGoLinkPreviewHost('s.shopee.co.th')).toBe(true);
    expect(isAllowedGoLinkPreviewHost('shp.ee')).toBe(true);
    expect(isAllowedGoLinkPreviewHost('www.lazada.co.th')).toBe(true);
    expect(isAllowedGoLinkPreviewHost('vt.tiktok.com')).toBe(true);
    expect(isAllowedGoLinkPreviewHost('www.konvy.com')).toBe(true);
  });

  it('rejects unrelated hosts (SSRF guard)', () => {
    expect(isAllowedGoLinkPreviewHost('evil.com')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('evilshopee.com')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('shopee.co.th.evil.com')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('myshopee.co.th')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('konvy.com.evil.com')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('169.254.169.254')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('localhost')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('127.0.0.1')).toBe(false);
  });
});

describe('parseGoLinkPreviewUrl', () => {
  it('accepts an HTTPS marketplace URL on the default port', () => {
    expect(
      parseGoLinkPreviewUrl(
        ' https://s.shopee.co.th:443/product/1 ',
      )?.toString(),
    ).toBe('https://s.shopee.co.th/product/1');
  });

  it.each([
    'http://shopee.co.th/product/1',
    'https://user:password@shopee.co.th/product/1',
    'https://shopee.co.th:8443/product/1',
    'https://127.0.0.1/product/1',
    'https://[::1]/product/1',
    'https://evilshopee.com/product/1',
    'https://shopee.co.th.evil.com/product/1',
  ])('rejects unsafe preview URL %s', (url) => {
    expect(parseGoLinkPreviewUrl(url)).toBeNull();
  });
});

describe('isPublicGoLinkPreviewAddress', () => {
  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fd00::1',
    'fe80::1',
    'ff02::1',
    '2001:10::1',
    '2001:1ff:ffff::1',
    '2001:db8::1',
    '3fff::1',
    '3fff:fff::1',
  ])('rejects non-public address %s', (address) => {
    expect(isPublicGoLinkPreviewAddress(address)).toBe(false);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '2001:200::1',
    '2606:4700:4700::1111',
    '3fff:1000::1',
  ])('allows public address %s', (address) => {
    expect(isPublicGoLinkPreviewAddress(address)).toBe(true);
  });
});

describe('extractOpenGraphPreview', () => {
  it('extracts og:title, og:image, og:description, and product price when present', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="LA GLACE Pads 160ml" />
        <meta property="og:image" content="https://cdn.example/product.jpg" />
        <meta property="og:description" content="Acne care toner pads" />
        <meta property="product:price:amount" content="290" />
        <meta property="product:price:currency" content="THB" />
      </head></html>
    `;
    expect(extractOpenGraphPreview(html)).toEqual({
      title: 'LA GLACE Pads 160ml',
      imageUrl: 'https://cdn.example/product.jpg',
      description: 'Acne care toner pads',
      price: '290 THB',
    });
  });

  it('returns null fields when tags are missing', () => {
    expect(extractOpenGraphPreview('<html></html>')).toEqual({
      title: null,
      imageUrl: null,
      description: null,
      price: null,
    });
  });
});
