import type { Connection } from 'mongoose';

export type PolicyTransactionCapability = {
  supported: boolean;
  topology: 'replica-set' | 'mongos' | 'standalone' | 'unavailable';
  reason?: string;
};

/** Shared, read-only topology probe used by aggregate saves and integrity gates. */
export async function inspectPolicyTransactionCapability(
  connection: Connection,
): Promise<PolicyTransactionCapability> {
  try {
    if (!connection.db) {
      return {
        supported: false,
        topology: 'unavailable',
        reason: 'MongoDB connection is not ready',
      };
    }
    const hello = (await connection.db.admin().command({ hello: 1 })) as Record<
      string,
      unknown
    >;
    const topology =
      typeof hello.setName === 'string'
        ? 'replica-set'
        : hello.msg === 'isdbgrid'
          ? 'mongos'
          : 'standalone';
    const hasSessions = typeof hello.logicalSessionTimeoutMinutes === 'number';
    return {
      supported:
        (topology === 'replica-set' || topology === 'mongos') && hasSessions,
      topology,
      ...(!hasSessions
        ? { reason: 'MongoDB topology does not advertise sessions' }
        : topology === 'standalone'
          ? { reason: 'MongoDB is not a replica set or mongos' }
          : {}),
    };
  } catch (error) {
    // Never leak URIs / credentials from driver errors — name only.
    const detail = error instanceof Error ? error.name : 'unknown';
    return {
      supported: false,
      topology: 'unavailable',
      reason: `MongoDB transaction capability check failed (${detail})`,
    };
  }
}

/** Stable machine code for admin/API clients when aggregate txn support is down. */
export const POLICY_TRANSACTIONS_UNSUPPORTED_CODE =
  'POLICY_TRANSACTIONS_UNSUPPORTED' as const;

export function policyTransactionsUnsupportedError(capability: {
  reason?: string;
  topology: PolicyTransactionCapability['topology'];
}) {
  return {
    statusCode: 503,
    code: POLICY_TRANSACTIONS_UNSUPPORTED_CODE,
    message:
      'Policy aggregate saves require MongoDB replica set or mongos transaction support.',
    reason:
      capability.reason ?? 'MongoDB transaction support is unavailable',
    topology: capability.topology,
  };
}
