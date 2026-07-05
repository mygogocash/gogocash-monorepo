# Figma brand logo export

Downloads all merchant logos from the [Merchant Brands logo redesigned](https://www.figma.com/design/3ICE2VHGMZqzTRweq3vCMI/Merchant-Brands-logo-redesigned?node-id=1-2) Figma file and organizes them by **brand slug** and **size category**.

## Size categories

| Folder | Figma source | Dimensions | Admin field |
|--------|--------------|------------|-------------|
| `default-shop-card` | Default Shop Card symbols (`Cover=False`) | 264×148.5 | `logo_desktop` |
| `default-shop-card-cover` | Default Shop Card symbols (`Cover=True`) | 264×148.5 | cover art variant |
| `logo-circle` | Mini Shop Card / 1:1 Logo symbols | 144×144 | `logo_circle` |
| `shop-page-banner` | Logo Banner for Shop Page instances | 1200×410 | `banner` |

## Prerequisites

1. Figma personal access token: **Settings → Security → Personal access tokens**
2. Export token as `FIGMA_ACCESS_TOKEN` (do not commit)

## Usage

```bash
# Preview what would be downloaded
FIGMA_ACCESS_TOKEN=figd_xxx node scripts/figma-brand-logos/download-brand-logos.mjs --dry-run

# Download all logos @2x PNG
FIGMA_ACCESS_TOKEN=figd_xxx node scripts/figma-brand-logos/download-brand-logos.mjs
```

Output:

```
docs/assets/brand-logos/
  shopee_th/
    default-shop-card/logo.png
    logo-circle/logo.png
    shop-page-banner/logo.png
  …
  manifest.json   # maps slug → figma node id, admin field, path
```

## Slug rules

Brand labels like `Shopee TH - CPS` become `shopee_th` (strip `- CPS`, lowercase, spaces → `_`). Override slugs in admin via **lookup_value** if needed.

## Shop page banners

Banner instances must expose a **Brand** component property in Figma. Unmapped banners are saved under `unknown_{nodeId}/` — fix in Figma and re-run, or rename folders manually to match `lookup_value`.
