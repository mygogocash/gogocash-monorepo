# GCS media storage — maintenance plan

Operational guide for the Google Drive → GCS migration (Phases 0–4). Code lives under `apps/api/src/media/`.

## Architecture

| Folder prefix | Content | Access | Mongo fields |
|---------------|---------|--------|--------------|
| `banner-home/` | Homepage banner slots | public | `banners.image_1..5` |
| `brands/` | Offer logos & covers | public | `offers.logo_*`, `banner*` |
| `categories/` | Category hero images | public | `categories.image` |
| `quests/` | Quest banners | public | `quests.banner_*` |
| `missing-orders/` | Customer receipt uploads | **private** | `missionorders.attachments[]` |
| `withdraw-slips/` | Payout proof slips | **private** | `withdraws.slip_file` |

Legacy **Google Drive file ids** still render (admin + customer) and are deleted on replace/clear. New uploads always go to GCS.

Private objects are shown in admin via `GET /admin/stored-media/stream?ref=<encoded-url>` (JWT required).

## Environment

| Variable | Purpose |
|----------|---------|
| `GCS_CATALOG_BUCKET` | Target bucket (`gogocash-catalog-staging` / `-production`) |
| `GCS_CATALOG_PUBLIC_BASE_URL` | Optional CDN/custom domain base |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local dev service-account JSON |
| `GCS_MAX_UPLOAD_BYTES` | Upload cap (default 10 MB) |
| `GCS_MEDIA_UPLOAD_DISABLED` | Kill-switch for all GCS uploads |

Cloud Run: grant the API service account **`roles/storage.objectAdmin`** on the bucket. No JSON key in prod.

Deploy workflows set `GCS_CATALOG_BUCKET` for staging and production API services.

## Operator commands

```bash
# Inventory legacy Drive ids vs GCS URLs (requires MONGO_URI)
npm run media:inventory -w gogocash-api

# Dry-run migration of public collections (banners, offers, categories, quests)
npm run media:migrate-to-gcs:dry -w gogocash-api

# Apply migration
npm run media:migrate-to-gcs -w gogocash-api

# Single collection
npm run media:migrate-to-gcs -w gogocash-api -- --collection=banners
```

Run inventory on staging before prod. Take a Mongo backup before `--dry-run=false`.

## Release checklist

1. Merge code; CI green (`npm test -w gogocash-api`).
2. Confirm bucket + IAM on `gogocash-staging`.
3. Deploy API staging (`Deploy API (staging)` workflow).
4. Deploy admin staging.
5. Smoke: Banner Home upload → `GET /offer/banner-home` → customer home hero.
6. Smoke: Brand logo upload in offer editor.
7. Optional: run `media:inventory` + `media:migrate-to-gcs` on staging.
8. Repeat for production bucket `gogocash-catalog-production`.

## Monitoring

Cloud Logging query for upload failures:

```
resource.type="cloud_run_revision"
textPayload=~"GCS upload failed"
OR textPayload=~"Media upload failed"
```

Alert on sustained `503` from `POST /admin/banner-home` or brand upload routes.

## Phase 4 (CDN & lifecycle) — manual GCP

1. **Cloud CDN** — front `GCS_CATALOG_PUBLIC_BASE_URL` with a load balancer + CDN backend bucket when customer traffic warrants it.
2. **Lifecycle** — optional rule to expire orphaned `banner-home/*` objects after 90d (requires orphan audit job first).
3. **Drive decommission** — when inventory shows `drive_id: 0` for all collections for 30 days, remove `GOOGLE_*` secrets from Cloud Run (keep module for legacy delete/stream until data verified).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 503 on image upload | Check Cloud Run SA → bucket IAM; verify `GCS_CATALOG_BUCKET` |
| Admin preview 401 on slip | Admin must be signed in; URL must use `/admin/stored-media/stream` |
| Customer image 403 | Public folder upload must succeed with `makePublic()`; check org policy |
| Legacy Drive id broken | Re-upload in admin or run migration script with Drive-accessible files |

_Last updated: 2026-06-28_
