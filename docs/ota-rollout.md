# OTA rollout and monitoring

Operational guide for EAS Update channels on GoGoCash mobile.

**Channels** (see `apps/app/eas.json`):

| Build profile | Channel       | Typical use                    |
| ------------- | ------------- | ------------------------------ |
| `development` | `development` | Dev client internal QA         |
| `preview`     | `staging`     | Staging API + internal testers |
| `production`  | `production`  | Store builds                   |

## After publishing an update

```bash
cd apps/app
eas update:list --branch staging --limit 5
eas channel:insights staging
eas update:insights <update-group-id>
```

Use `eas-update-insights` skill for interpreting rollout health.

## Rollback

1. **Republish previous bundle** — `eas update:republish --group <previous-group-id> --branch staging`
2. **Or repoint channel** — publish a known-good update with `--message "rollback: ..."`

## Weekly operator checklist

- [ ] `eas channel:insights production` — error rate below team threshold
- [ ] Compare crash-free sessions in Sentry (when native plugin enabled)
- [ ] Confirm latest staging OTA matches expected `github.sha` from CI
- [ ] Document any rollback in incident log

## CI automation

- Manual: `.github/workflows/deploy-app-native-eas.yml` → action `update`;
  the workflow requires a completed successful `ci-staging.yml` push run for
  the exact staging SHA, including its successful aggregate and mobile app
  jobs.
- On a `staging` push with app changes, `ci-staging.yml` calls the same hardened
  workflow only after the reusable app CI gate succeeds. It supplies the exact
  caller run ID; publishing requires the active `staging` channel to map only
  to the `staging` branch and must return exactly one Android and one iOS update
  sharing one group/runtime.

Manual and automatic staging EAS actions share one non-canceling queue. After
the job acquires it, it rejects a SHA that is no longer the current staging
head. All four required Firebase variables must be present before publishing;
their values are not logged.

## Related

- [ota-smoke.md](./ota-smoke.md) — first-time OTA verification
- [mobile-expo-delegation-plan.md](./mobile-expo-delegation-plan.md) — Phase 1–2
