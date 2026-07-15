import { AdminInviteStateSchema } from './admin-invite-state.schema';

describe('AdminInviteStateSchema', () => {
  it('keeps one authoritative lease and token pointer per normalized email', () => {
    const emailIndex = AdminInviteStateSchema.indexes().find(
      ([fields]) => fields.email === 1,
    );

    expect(emailIndex).toEqual([{ email: 1 }, { unique: true }]);
  });
});
