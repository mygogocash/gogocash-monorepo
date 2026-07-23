/**
 * Guarded #353 membership assignment-boundary migration.
 *
 * Omitting --apply is a zero-write dry run. See
 * docs/quest-task-v2-rollout.md for the required rollout order and flags.
 */
import 'dotenv/config';

import {
  executeMembershipTierAssignmentMigration,
  redactMongoCredentials,
} from '../src/admin/membership/membership-tier-assignment-migration';

executeMembershipTierAssignmentMigration(process.argv.slice(2))
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    const message = redactMongoCredentials(
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      JSON.stringify({
        issue: 353,
        operation: 'membership-tier-assignment-boundary-backfill',
        status: 'error',
        message,
      }),
    );
    process.exitCode = 1;
  });
