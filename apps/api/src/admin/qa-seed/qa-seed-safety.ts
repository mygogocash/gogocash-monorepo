export const QA_STAGING_CONFIRMATION = 'SEED-QA-MATRIX-STAGING';

export type QaSeedEnvironment = 'local' | 'staging';

export type QaSeedSafetyOptions = {
  environment: QaSeedEnvironment;
  expectedDatabase: string;
  confirmation?: string;
  platformEnvironment?: string;
};

type MongoTarget = {
  databaseName: string;
  hosts: string[];
};

function inspectMongoTarget(mongoUri: string): MongoTarget {
  const match = mongoUri.match(/^mongodb(?:\+srv)?:\/\/([^/]+)(?:\/([^?]*))?/i);
  if (!match) {
    throw new Error(
      'MONGO_URI must be a valid mongodb:// or mongodb+srv:// URI',
    );
  }

  const authority = match[1].slice(match[1].lastIndexOf('@') + 1);
  const hosts = authority.split(',').map((entry) => {
    const trimmed = entry.trim();
    if (trimmed.startsWith('[')) {
      return trimmed.slice(1, trimmed.indexOf(']')).toLowerCase();
    }
    return trimmed.split(':')[0].toLowerCase();
  });
  const databaseName = decodeURIComponent(match[2] || 'test').trim();
  if (!databaseName || databaseName.includes('/')) {
    throw new Error('MONGO_URI must select exactly one database');
  }

  return { databaseName, hosts };
}

const isLoopbackHost = (host: string): boolean =>
  host === 'localhost' || host === '127.0.0.1' || host === '::1';

export function assertQaSeedTarget(
  mongoUri: string,
  options: QaSeedSafetyOptions,
): MongoTarget {
  const target = inspectMongoTarget(mongoUri);
  const expectedDatabase = options.expectedDatabase.trim();
  if (!expectedDatabase) {
    throw new Error('--expected-db is required');
  }
  if (/prod(?:uction)?/i.test(expectedDatabase)) {
    throw new Error(
      'Production-named databases are never valid QA seed targets',
    );
  }
  if (target.databaseName !== expectedDatabase) {
    throw new Error(
      `MONGO_URI selects ${target.databaseName}; expected database ${expectedDatabase}`,
    );
  }

  if (options.environment === 'local') {
    if (!target.hosts.every(isLoopbackHost)) {
      throw new Error('Local QA seeds require a loopback MongoDB host');
    }
    return target;
  }

  if (options.environment !== 'staging') {
    throw new Error('QA seed environment must be local or staging');
  }
  if (options.confirmation !== QA_STAGING_CONFIRMATION) {
    throw new Error(
      `Staging confirmation requires --confirm-staging=${QA_STAGING_CONFIRMATION}`,
    );
  }
  if (options.platformEnvironment?.trim().toLowerCase() !== 'staging') {
    throw new Error(
      `Refusing staging seed: platform environment RAILWAY_ENVIRONMENT_NAME must be staging (received ${options.platformEnvironment ?? 'unset'})`,
    );
  }
  if (!target.hosts.some((host) => host.includes('staging'))) {
    throw new Error(
      `Refusing MongoDB host without a staging marker: ${target.hosts.join(', ')}`,
    );
  }

  return target;
}

export function assertConnectedQaDatabase(
  connectedDatabase: string | undefined,
  expectedDatabase: string,
): void {
  if (connectedDatabase !== expectedDatabase) {
    throw new Error(
      `Connected database ${connectedDatabase ?? 'unknown'} does not match expected database ${expectedDatabase}`,
    );
  }
}
