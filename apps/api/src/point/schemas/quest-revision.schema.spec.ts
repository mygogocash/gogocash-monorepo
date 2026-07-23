import { QuestSchema } from './quest.schema';

describe('Quest revision indexes', () => {
  it.each(['revision_request_key', 'publish_request_key'])(
    'declares exactly one unique sparse index for %s',
    (field) => {
      const matches = QuestSchema.indexes().filter(
        ([definition]) => definition[field] === 1,
      );

      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toMatchObject({ unique: true, sparse: true });
    },
  );
});
