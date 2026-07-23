import { sanitizeAdminQuestRecord } from './quest-admin-record';

describe('sanitizeAdminQuestRecord', () => {
  it('normalizes a document before removing server-only command fields', () => {
    const document = {
      _doc: { revision_request_key: 'must-not-leak' },
      toObject: () => ({
        _id: 'quest-1',
        revision_reason: 'Visible operator context',
        revision_request_key: 'private-revision-command',
        revision_payload_hash: 'a'.repeat(64),
        published_by: 'private-admin-id',
        banner_assets: { banner_en: { owner_key: 'private-owner' } },
        media_command_key: 'private-media-command',
        legacy_payout_resolution_command_key: 'private-payout-command',
        legacy_payout_resolution_plan_checksum: 'b'.repeat(64),
      }),
    };

    expect(sanitizeAdminQuestRecord(document)).toEqual({
      _id: 'quest-1',
      revision_reason: 'Visible operator context',
    });
  });
});
