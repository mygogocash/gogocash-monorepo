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
  } catch {
    return {
      supported: false,
      topology: 'unavailable',
      reason: 'MongoDB transaction capability check failed',
    };
  }
}
