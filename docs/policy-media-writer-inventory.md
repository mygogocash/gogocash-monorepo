# Policy media writer inventory

The machine-enforced inventory is [`scripts/policy-media-writer-inventory.json`](../scripts/policy-media-writer-inventory.json). Its contract test fails when a Category, Offer, Brand, Involve, or operational media writer is missing its safety classification or its evidence disappears.

## Allowed classifications

| Classification                    | Required behavior                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `durable-command-registry-fenced` | Journal exact command ownership before Put, then register and attach in the owner transaction.                                                         |
| `registry-transaction-fenced`     | Read/touch `policy_media_asset_registry` in the same transaction as the new aggregate reference. Registry absence remains legacy and nondeletable.     |
| `registry-deletion-fenced`        | Claim the active registry row, scan Category/Offer/Brand references, and delete only exact command-owned objects.                                      |
| `readiness-registry-backfill`     | Run under the guarded readiness migration, quarantine ambiguous proof, and create the required unique registry indexes.                                |
| `legacy-untracked-nondeletable`   | Accept only positively identified legacy inputs, refuse structured/tracked targets, and never make resulting raw URLs eligible for automated deletion. |

`Policy.banner` is authored policy content, not stored media. Home banners, quest art, withdrawal slips, user avatars, and local Figma export/download tools are outside the Category/Offer/Brand policy-media lifecycle. The GCS-to-R2 URL migration is included because its target list contains Category and Offer URL aliases. It now defaults to dry-run, refuses structured proof or any current/prospective registry row, rechecks after copy, and compare-and-sets the exact old document. Its accepted GCS input and unregistered R2 output remain explicitly legacy/nondeletable.

Operational legacy writers must not be used as a shortcut for new uploads. The Figma Offer sync and GCS-to-R2 migration can only rewrite positively identified, untracked raw legacy references. New administrator uploads belong behind `PolicyMediaWriteService` or the aggregate command path so their ownership is journaled before Put and registered transactionally.

Any new database writer that adds, replaces, mirrors, or removes a listed aggregate media URL must add an inventory entry and a focused safety test in the same change.
