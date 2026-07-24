import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CloseQuestDto, CreateQuestRevisionDto } from './create-quest.dto';

describe('CreateQuestRevisionDto', () => {
  const input = {
    request_key: 'quest-revision:2026-08-launch',
    expected_campaign_revision: 0,
    expected_config_revision: 0,
    start_date: '2099-08-01T00:00:00.000Z',
    end_date: '2099-08-31T23:59:59.999Z',
    reason: '  Prepare the next monthly campaign.  ',
  };

  it('trims and accepts a meaningful audit reason', async () => {
    const dto = plainToInstance(CreateQuestRevisionDto, input);

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.reason).toBe('Prepare the next monthly campaign.');
  });

  it('rejects a whitespace-only audit reason', async () => {
    const dto = plainToInstance(CreateQuestRevisionDto, {
      ...input,
      reason: '    ',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});

describe('CloseQuestDto', () => {
  it('requires an explicit quest id and campaign revision fence', async () => {
    const dto = plainToInstance(CloseQuestDto, {
      quest_id: '66a8a48f2c8de0e641e17424',
      expected_campaign_revision: '3',
      status: 'close',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.expected_campaign_revision).toBe(3);
  });

  it('rejects the legacy global close payload', async () => {
    const dto = plainToInstance(CloseQuestDto, { status: 'close' });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('rejects attempts to reopen or reschedule through the close command', async () => {
    const dto = plainToInstance(CloseQuestDto, {
      quest_id: '66a8a48f2c8de0e641e17424',
      expected_campaign_revision: 3,
      status: 'open',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
