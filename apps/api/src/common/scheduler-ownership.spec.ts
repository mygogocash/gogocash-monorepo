import { describeSchedulerOwnership } from './scheduler-ownership';

describe('describeSchedulerOwnership', () => {
  it('given an empty env > then reports the fail-open defaults (legacy crons + withdrawals on, quest-v2 + telegram off)', () => {
    expect(describeSchedulerOwnership({})).toBe(
      'scheduler-ownership legacy_crons=on quest_v2=off telegram=off withdrawals=on',
    );
  });

  it('given CRON_ENABLED=false > then legacy crons report off', () => {
    expect(describeSchedulerOwnership({ CRON_ENABLED: 'false' })).toContain(
      'legacy_crons=off',
    );
  });

  it('given QUEST_TASK_V2_ENABLED=true (any case/padding) > then quest-v2 reports on', () => {
    expect(
      describeSchedulerOwnership({ QUEST_TASK_V2_ENABLED: 'true' }),
    ).toContain('quest_v2=on');
    expect(
      describeSchedulerOwnership({ QUEST_TASK_V2_ENABLED: ' TRUE ' }),
    ).toContain('quest_v2=on');
  });

  it('given a PLACEHOLDER telegram token > then telegram reports off (module is not loaded)', () => {
    expect(
      describeSchedulerOwnership({ TELEGRAM_BOT_TOKEN: 'PLACEHOLDER' }),
    ).toContain('telegram=off');
    expect(
      describeSchedulerOwnership({ TELEGRAM_BOT_TOKEN: '12345:real-token' }),
    ).toContain('telegram=on');
  });

  it('given only a login-verification token > then Telegram poller ownership stays off', () => {
    expect(
      describeSchedulerOwnership({
        TELEGRAM_LOGIN_BOT_TOKEN: '12345:login-widget-bot-token-copy',
      }),
    ).toContain('telegram=off');
  });

  it('given WITHDRAWALS_ENABLED=false > then withdrawals report off', () => {
    expect(
      describeSchedulerOwnership({ WITHDRAWALS_ENABLED: 'false' }),
    ).toContain('withdrawals=off');
  });

  it('never includes secret values, only on/off states', () => {
    const line = describeSchedulerOwnership({
      TELEGRAM_BOT_TOKEN: '12345:secret-token-value',
    });
    expect(line).not.toContain('secret-token-value');
  });
});
