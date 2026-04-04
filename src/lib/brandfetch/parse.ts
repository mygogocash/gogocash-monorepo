const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const FORMAT_ORDER = ["webp", "png", "jpeg", "svg"] as const;

export function extractBrandfetchDomain(input: string | undefined | null): string | null {
  if (!input?.trim()) return null;
  try {
    let s = input.trim();
    if (!/^https?:\/\//i.test(s)) {
      s = `https://${s}`;
    }
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./i, "");
    if (!host || !host.includes(".")) return null;
    return host.toLowerCase();
  } catch {
    return null;
  }
}

/** Hostname only; rejects oddities that should not hit Brandfetch. */
export function validateBrandfetchDomainParam(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const host = raw
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (host.length < 3 || host.length > 253) return null;
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(host)) return null;
  if (host.includes("..")) return null;
  return host.toLowerCase();
}

export function pickBestFormatSrc(formats: unknown): string | null {
  if (!Array.isArray(formats) || formats.length === 0) return null;
  const rank = (format: string) => {
    const i = FORMAT_ORDER.indexOf(format as (typeof FORMAT_ORDER)[number]);
    return i === -1 ? 99 : i;
  };
  const parsed = formats
    .filter((f): f is { src: string; format: string } => {
      if (!isRecord(f)) return false;
      return typeof f.src === "string" && typeof f.format === "string" && f.src.length > 0;
    })
    .sort((a, b) => rank(a.format) - rank(b.format));
  return parsed[0]?.src ?? null;
}

interface LogoLike {
  type?: string;
  theme?: string | null;
  formats?: unknown;
}

function readLogos(data: Record<string, unknown>): LogoLike[] {
  const logos = data.logos;
  if (!Array.isArray(logos)) return [];
  return logos.filter((l): l is LogoLike => isRecord(l));
}

function readImages(data: Record<string, unknown>): { type?: string; formats?: unknown }[] {
  const images = data.images;
  if (!Array.isArray(images)) return [];
  return images.filter((i): i is { type?: string; formats?: unknown } => isRecord(i));
}

export type BrandfetchHeroAssets = {
  name: string | null;
  domain: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
};

export type BrandfetchHeroApiResponse =
  | ({ ok: true } & BrandfetchHeroAssets)
  | { ok: false; reason: "no_key" | "bad_domain" | "upstream" | "not_found" };

export function pickBrandfetchHeroAssets(data: unknown): BrandfetchHeroAssets | null {
  if (!isRecord(data)) return null;
  const domain = typeof data.domain === "string" ? data.domain : null;
  if (!domain) return null;

  const name = typeof data.name === "string" ? data.name : null;

  const logos = readLogos(data);
  const pickLogo = (type: string, theme?: string) => {
    const withTheme =
      theme !== undefined ? logos.find((l) => l.type === type && l.theme === theme) : undefined;
    const anyType = withTheme ?? logos.find((l) => l.type === type);
    return anyType ? pickBestFormatSrc(anyType.formats) : null;
  };

  const iconUrl = pickLogo("icon") ?? pickLogo("symbol");
  const logoUrl =
    pickLogo("logo", "dark") ?? pickLogo("logo", "light") ?? pickLogo("logo") ?? iconUrl;

  const images = readImages(data);
  const bannerImg = images.find((i) => i.type === "banner");
  const bannerUrl = bannerImg ? pickBestFormatSrc(bannerImg.formats) : null;

  return {
    name,
    domain,
    bannerUrl,
    logoUrl,
    iconUrl,
  };
}
