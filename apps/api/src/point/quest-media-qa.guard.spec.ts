import {
  assertQuestMediaQaMutationEnabled,
  questMediaQaMutationEnabled,
} from './quest-media-qa.guard';

describe('quest media QA mutation guard', () => {
  it('is hard-disabled by default', () => {
    expect(questMediaQaMutationEnabled({})).toBe(false);
    expect(() => assertQuestMediaQaMutationEnabled({})).toThrow(
      'Quest media acceptance mutation is disabled',
    );
  });

  it('allows explicit local/test or Railway staging enablement only', () => {
    expect(
      questMediaQaMutationEnabled({
        NODE_ENV: 'test',
        QUEST_MEDIA_QA_ENABLED: 'true',
      }),
    ).toBe(true);
    expect(
      questMediaQaMutationEnabled({
        NODE_ENV: 'production',
        RAILWAY_ENVIRONMENT_NAME: 'staging',
        QUEST_MEDIA_QA_ENABLED: 'true',
      }),
    ).toBe(true);
  });

  it('stays disabled in production even when the feature flag is accidentally set', () => {
    expect(
      questMediaQaMutationEnabled({
        NODE_ENV: 'production',
        RAILWAY_ENVIRONMENT_NAME: 'production',
        QUEST_MEDIA_QA_ENABLED: 'true',
      }),
    ).toBe(false);
  });

  it('fails closed when NODE_ENV is missing or unknown', () => {
    expect(
      questMediaQaMutationEnabled({
        QUEST_MEDIA_QA_ENABLED: 'true',
        RAILWAY_ENVIRONMENT_NAME: 'staging',
      }),
    ).toBe(false);
    expect(
      questMediaQaMutationEnabled({
        NODE_ENV: 'preview',
        QUEST_MEDIA_QA_ENABLED: 'true',
        RAILWAY_ENVIRONMENT_NAME: 'staging',
      }),
    ).toBe(false);
  });

  it('never lets fallback APP_ENV override an authoritative production or conflicting Railway identity', () => {
    expect(
      questMediaQaMutationEnabled({
        NODE_ENV: 'production',
        QUEST_MEDIA_QA_ENABLED: 'true',
        RAILWAY_ENVIRONMENT_NAME: 'production',
        APP_ENV: 'staging',
      }),
    ).toBe(false);
    expect(
      questMediaQaMutationEnabled({
        NODE_ENV: 'production',
        QUEST_MEDIA_QA_ENABLED: 'true',
        RAILWAY_ENVIRONMENT_NAME: 'staging',
        RAILWAY_ENVIRONMENT: 'production',
        APP_ENV: 'staging',
      }),
    ).toBe(false);
  });
});
