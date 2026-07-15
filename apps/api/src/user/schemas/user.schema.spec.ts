import { UserSchema } from './user.schema';

describe('UserSchema', () => {
  it('defines a sparse unique index for canonical verified phone ownership', () => {
    const canonicalPhoneIndex = UserSchema.indexes().find(
      ([fields]) => fields.verified_phone_e164 === 1,
    );

    expect(canonicalPhoneIndex).toEqual([
      { verified_phone_e164: 1 },
      {
        name: 'uniq_user_verified_phone_e164',
        sparse: true,
        unique: true,
      },
    ]);
  });
});
