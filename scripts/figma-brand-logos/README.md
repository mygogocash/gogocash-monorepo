# Figma brand logo export

Downloads all merchant logos from the [Merchant Brands logo redesigned](https://www.figma.com/design/3ICE2VHGMZqzTRweq3vCMI/Merchant-Brands-logo-redesigned?node-id=1-2) Figma file and organizes them by **brand slug** and **size category**.

## Size categories

| Folder | Figma source | Dimensions | Admin FormOffer field |
|--------|--------------|------------|------------------------|
| `default-shop-card` | Default Shop Card symbols (`Cover=False`) | 264×148.5 | (legacy card art; not synced by default) |
| `default-shop-card-cover` | Default Shop Card symbols (`Cover=True`) | 264×148.5 | cover art variant |
| `logo-circle` | Mini Shop Card / 1:1 Logo symbols | 144×144 | **Logo** → `logo_desktop` + `logo_mobile` |
| `shop-page-banner` | Logo Banner for Shop Page instances | 1200×410 | **Brand cover** → `logo_circle` |

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

## Sync to offers (admin Logos & media)

After downloading assets, push **Logo** and **Brand cover** to every matching offer (`lookup_value` ↔ manifest slug):

```bash
# Preview matches + planned field updates (no writes)
node scripts/figma-brand-logos/sync-offer-media-from-manifest.mjs --dry-run

# One brand
node scripts/figma-brand-logos/sync-offer-media-from-manifest.mjs --slug=agoda --apply

# All brands with both logo-circle + shop-page-banner in manifest
MONGO_URI=... R2_*=... node scripts/figma-brand-logos/sync-offer-media-from-manifest.mjs --apply
```

Field mapping matches admin **FormOffer → Logos & media**:

- `logo-circle/logo.png` → `logo_desktop` + `logo_mobile`
- `shop-page-banner/logo.png` → `logo_circle` (brand shop page cover)

Requires the same `MONGO_URI` and `R2_*` env vars as `gogocash-api`. Default is dry-run; pass `--apply` to upload and patch offers.
