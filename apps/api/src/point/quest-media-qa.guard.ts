import { ForbiddenException } from '@nestjs/common';

type QuestMediaQaEnv = Record<string, string | undefined>;

export function questMediaQaMutationEnabled(
  env: QuestMediaQaEnv = process.env,
): boolean {
  if (env.QUEST_MEDIA_QA_ENABLED?.trim().toLowerCase() !== 'true') {
    return false;
  }
  const nodeEnvironment = env.NODE_ENV?.trim().toLowerCase();
  if (!['development', 'test', 'production'].includes(nodeEnvironment ?? '')) {
    return false;
  }

  const railwayIdentities = [
    env.RAILWAY_ENVIRONMENT_NAME,
    env.RAILWAY_ENVIRONMENT,
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  const distinctRailwayIdentities = new Set(railwayIdentities);
  if (
    distinctRailwayIdentities.size > 1 ||
    railwayIdentities.includes('production')
  ) {
    return false;
  }

  const appEnvironment = env.APP_ENV?.trim().toLowerCase();
  if (appEnvironment === 'production') return false;

  if (nodeEnvironment !== 'production') return true;
  return (
    distinctRailwayIdentities.size === 1 &&
    distinctRailwayIdentities.has('staging') &&
    (!appEnvironment || appEnvironment === 'staging')
  );
}

export function assertQuestMediaQaMutationEnabled(
  env: QuestMediaQaEnv = process.env,
): void {
  if (!questMediaQaMutationEnabled(env)) {
    throw new ForbiddenException(
      'Quest media acceptance mutation is disabled for this environment.',
    );
  }
}
