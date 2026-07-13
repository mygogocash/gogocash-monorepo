import { isAllowedGoLinkPreviewHost, extractOpenGraphPreview } from './golink-preview.util';

describe('isAllowedGoLinkPreviewHost', () => {
  it('allows known marketplace hosts', () => {
    expect(isAllowedGoLinkPreviewHost('shopee.co.th')).toBe(true);
    expect(isAllowedGoLinkPreviewHost('s.shopee.co.th')).toBe(true);
    expect(isAllowedGoLinkPreviewHost('shp.ee')).toBe(true);
    expect(isAllowedGoLinkPreviewHost('www.lazada.co.th')).toBe(true);
    expect(isAllowedGoLinkPreviewHost('vt.tiktok.com')).toBe(true);
  });

  it('rejects unrelated hosts (SSRF guard)', () => {
    expect(isAllowedGoLinkPreviewHost('evil.com')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('169.254.169.254')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('localhost')).toBe(false);
    expect(isAllowedGoLinkPreviewHost('127.0.0.1')).toBe(false);
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
