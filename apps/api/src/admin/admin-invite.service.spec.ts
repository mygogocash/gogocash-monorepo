import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AdminInviteService } from './admin-invite.service';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function makeService(over: {
  userAdmin?: Partial<Record<string, jest.Mock>>;
  token?: Partial<Record<string, jest.Mock>>;
  sendEmail?: jest.Mock;
}) {
  const sendEmail = over.sendEmail ?? jest.fn().mockResolvedValue(undefined);
  const userAdminModel = {
    findOne: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({ _id: 'a1' }),
    ...over.userAdmin,
  } as unknown as never;
  const tokenModel = {
    findOneAndUpdate: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 't1' }) }),
    findOne: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    updateOne: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    ...over.token,
  } as unknown as never;
  const config = {
    get: (k: string) =>
      k === 'env.ADMIN_APP_URL'
        ? 'https://admin-staging.gogocash.co'
        : undefined,
  } as unknown as never;
  const service = new AdminInviteService(
    userAdminModel,
    tokenModel,
    sendEmailService(sendEmail),
    config,
  );
  return { service, sendEmail, userAdminModel, tokenModel };
}

// EmailService stand-in (only sendEmail is used).
const sendEmailService = (sendEmail: jest.Mock) =>
  ({ sendEmail }) as unknown as never;

describe('AdminInviteService', () => {
  describe('invite', () => {
    it('stores an invite token and emails an accept-invite link', async () => {
      const { service, sendEmail, tokenModel } = makeService({});
      const res = await service.invite('new@gogocash.co', 'editor');

      const tokenArgs = (
        tokenModel as unknown as { findOneAndUpdate: jest.Mock }
      ).findOneAndUpdate.mock.calls[0];
      expect(tokenArgs[0]).toEqual({
        email: 'new@gogocash.co',
        purpose: 'invite',
      });
      expect(tokenArgs[1]).toEqual(
        expect.objectContaining({
          email: 'new@gogocash.co',
          purpose: 'invite',
          role: 'editor',
        }),
      );
      const mail = sendEmail.mock.calls[0][0];
      expect(mail.to).toBe('new@gogocash.co');
      expect(`${mail.html} ${mail.text}`).toContain('/accept-invite?token=');
      expect(res).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('rejects when an admin with that email already exists', async () => {
      const { service } = makeService({
        userAdmin: {
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ _id: 'x' }),
          }),
        },
      });
      await expect(
        service.invite('dupe@gogocash.co', 'viewer'),
      ).rejects.toThrow();
    });
  });

  describe('acceptInvite', () => {
    it('creates the admin with the invited role + hashed password and consumes the token', async () => {
      const raw = 'rawtoken123';
      const { service, userAdminModel, tokenModel } = makeService({
        token: {
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              _id: 't1',
              email: 'new@gogocash.co',
              role: 'editor',
            }),
          }),
        },
      });

      const res = await service.acceptInvite({
        token: raw,
        email: 'new@gogocash.co',
        password: 'sup3rsecret',
      });

      // looked up by the HASHED token, scoped to invite purpose
      const findArg = (tokenModel as unknown as { findOne: jest.Mock }).findOne
        .mock.calls[0][0];
      expect(findArg).toEqual(
        expect.objectContaining({ tokenHash: sha256(raw), purpose: 'invite' }),
      );

      const created = (userAdminModel as unknown as { create: jest.Mock })
        .create.mock.calls[0][0];
      expect(created.email).toBe('new@gogocash.co');
      expect(created.role).toBe('editor');
      expect(created.username).toBeTruthy();
      expect(await bcrypt.compare('sup3rsecret', created.password)).toBe(true);
      expect(
        (tokenModel as unknown as { updateOne: jest.Mock }).updateOne,
      ).toHaveBeenCalled();
      expect(res).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('rejects an invalid/expired invite token', async () => {
      const { service } = makeService({});
      await expect(
        service.acceptInvite({
          token: 'bad',
          email: 'x@y.co',
          password: 'longenough',
        }),
      ).rejects.toThrow();
    });
  });

  describe('forgotPassword', () => {
    it('emails a reset link to an existing admin', async () => {
      const { service, sendEmail } = makeService({
        userAdmin: {
          findOne: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({ _id: 'a1', email: 'me@gogocash.co' }),
          }),
        },
      });
      await service.forgotPassword('me@gogocash.co');
      const mail = sendEmail.mock.calls[0][0];
      expect(mail.to).toBe('me@gogocash.co');
      expect(`${mail.html} ${mail.text}`).toContain('/reset-password?token=');
    });

    it('does NOT email (but still returns generic success) for an unknown email', async () => {
      const { service, sendEmail } = makeService({}); // findOne → null
      const res = await service.forgotPassword('ghost@gogocash.co');
      expect(sendEmail).not.toHaveBeenCalled();
      expect(res).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });
  });

  describe('resetPassword', () => {
    it('sets a new hashed password for a valid token and consumes it', async () => {
      const raw = 'resetraw';
      const save = jest.fn().mockResolvedValue(undefined);
      const adminDoc: { password?: string; save: jest.Mock; email: string } = {
        email: 'me@gogocash.co',
        save,
      } as never;
      const { service, tokenModel } = makeService({
        token: {
          findOne: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({ _id: 't1', email: 'me@gogocash.co' }),
          }),
        },
        userAdmin: {
          findOne: jest
            .fn()
            .mockReturnValue({ exec: jest.fn().mockResolvedValue(adminDoc) }),
        },
      });

      await service.resetPassword({
        token: raw,
        email: 'me@gogocash.co',
        password: 'brandNewPass',
      });

      expect(
        await bcrypt.compare('brandNewPass', adminDoc.password as string),
      ).toBe(true);
      expect(save).toHaveBeenCalled();
      expect(
        (tokenModel as unknown as { updateOne: jest.Mock }).updateOne,
      ).toHaveBeenCalled();
    });

    it('rejects an invalid/expired reset token', async () => {
      const { service } = makeService({});
      await expect(
        service.resetPassword({
          token: 'bad',
          email: 'x@y.co',
          password: 'longenough',
        }),
      ).rejects.toThrow();
    });
  });
});
