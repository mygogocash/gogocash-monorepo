import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AdminInviteService } from './admin-invite.service';

const actor = { id: 'admin-1', label: 'owner@gogocash.co' };

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function mockQuery<T>(value: T) {
  const exec = jest.fn().mockResolvedValue(value);
  const chain = { exec, collation: jest.fn().mockReturnValue({ exec }) };
  return jest.fn().mockReturnValue(chain);
}

function makeService(over: {
  userAdmin?: Partial<Record<string, jest.Mock>>;
  token?: Partial<Record<string, jest.Mock>>;
  inviteState?: Partial<Record<string, jest.Mock>>;
  sendEmail?: jest.Mock;
  append?: jest.Mock;
  appendRequired?: jest.Mock;
  connection?: Partial<Record<string, jest.Mock>>;
}) {
  const sendEmail = over.sendEmail ?? jest.fn().mockResolvedValue(undefined);
  const append = over.append ?? jest.fn().mockResolvedValue(undefined);
  const appendRequired =
    over.appendRequired ?? jest.fn().mockResolvedValue(undefined);
  const userAdminModel = {
    findOne: mockQuery(null),
    create: jest.fn().mockResolvedValue({ _id: 'a1' }),
    updateOne: mockQuery({ matchedCount: 1, modifiedCount: 1 }),
    ...over.userAdmin,
  } as unknown as never;
  const tokenModel = {
    deleteMany: mockQuery({}),
    deleteOne: mockQuery({}),
    create: jest.fn().mockResolvedValue({ _id: 't1' }),
    findOne: mockQuery(null),
    findOneAndUpdate: mockQuery(null),
    updateOne: mockQuery({}),
    ...over.token,
  } as unknown as never;
  const inviteStateModel = {
    findOneAndUpdate: mockQuery({
      email: 'new@gogocash.co',
      activeTokenHash: 'previous-active-hash',
    }),
    findOne: mockQuery(null),
    updateOne: mockQuery({ matchedCount: 1 }),
    ...over.inviteState,
  } as unknown as never;
  const config = {
    get: (k: string) =>
      k === 'env.ADMIN_APP_URL'
        ? 'https://admin-staging.gogocash.co'
        : undefined,
  } as unknown as never;
  const session = {
    withTransaction: jest.fn(async (operation: () => Promise<void>) =>
      operation(),
    ),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const connection = {
    startSession: jest.fn().mockResolvedValue(session),
    ...over.connection,
  } as unknown as never;
  const service = new AdminInviteService(
    userAdminModel,
    tokenModel,
    inviteStateModel,
    sendEmailService(sendEmail),
    config,
    { append, appendRequired } as never,
    connection,
  );
  return {
    service,
    sendEmail,
    userAdminModel,
    tokenModel,
    inviteStateModel,
    append,
    appendRequired,
    connection,
    session,
  };
}

// EmailService stand-in (only sendEmail is used).
const sendEmailService = (sendEmail: jest.Mock) =>
  ({ sendEmail }) as unknown as never;

describe('AdminInviteService', () => {
  describe('invite', () => {
    it('holds a per-email lease, then atomically promotes the acknowledged token as authoritative', async () => {
      const { service, sendEmail, tokenModel, inviteStateModel } = makeService(
        {},
      );
      const res = await service.invite('New@GoGoCash.co', 'editor', actor);

      const findOneAndUpdate = (
        inviteStateModel as unknown as { findOneAndUpdate: jest.Mock }
      ).findOneAndUpdate;
      expect(findOneAndUpdate).toHaveBeenCalledTimes(2);

      const [acquireFilter, acquireUpdate, acquireOptions] =
        findOneAndUpdate.mock.calls[0];
      expect(acquireFilter).toEqual(
        expect.objectContaining({
          email: 'new@gogocash.co',
          $or: expect.any(Array),
        }),
      );
      expect(acquireUpdate).toEqual(
        expect.objectContaining({
          $set: expect.objectContaining({
            leaseOwner: expect.any(String),
            leaseExpiresAt: expect.any(Date),
          }),
          $setOnInsert: expect.objectContaining({
            email: 'new@gogocash.co',
            activeTokenHash: null,
          }),
        }),
      );
      expect(acquireOptions).toEqual(
        expect.objectContaining({
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }),
      );

      const deleteMany = (tokenModel as unknown as { deleteMany: jest.Mock })
        .deleteMany;
      const created = (tokenModel as unknown as { create: jest.Mock }).create
        .mock.calls[0][0];
      expect(created).toEqual(
        expect.objectContaining({
          email: 'new@gogocash.co',
          purpose: 'invite',
          role: 'editor',
        }),
      );
      const mail = sendEmail.mock.calls[0][0];
      expect(mail.to).toBe('new@gogocash.co');
      expect(`${mail.html} ${mail.text}`).toContain('/accept-invite?token=');
      expect(`${mail.html} ${mail.text}`).toContain('email=new%40gogocash.co');

      const [promoteFilter, promoteUpdate] = findOneAndUpdate.mock.calls[1];
      expect(promoteFilter).toEqual({
        email: 'new@gogocash.co',
        leaseOwner: acquireUpdate.$set.leaseOwner,
      });
      expect(promoteUpdate).toEqual({
        $set: {
          activeTokenHash: created.tokenHash,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      expect(sendEmail.mock.invocationCallOrder[0]).toBeLessThan(
        findOneAndUpdate.mock.invocationCallOrder[1],
      );
      expect(deleteMany).toHaveBeenCalledWith({
        purpose: 'invite',
        email: 'new@gogocash.co',
        tokenHash: 'previous-active-hash',
      });
      expect(findOneAndUpdate.mock.invocationCallOrder[1]).toBeLessThan(
        deleteMany.mock.invocationCallOrder[0],
      );
      expect(res).toEqual(
        expect.objectContaining({
          message: expect.stringMatching(/accepted for delivery/i),
          deliveryStatus: 'accepted',
        }),
      );
    });

    it('when two resends overlap > only the lease owner sends and the loser gets actionable 409', async () => {
      const duplicateKey = Object.assign(new Error('duplicate key'), {
        code: 11000,
      });
      let acquireCount = 0;
      const queryChain = <T>(result: Promise<T>) => {
        const exec = jest.fn(() => result);
        return { exec, collation: jest.fn().mockReturnValue({ exec }) };
      };
      const findOneAndUpdate = jest.fn((filter: Record<string, unknown>) => {
        if ('$or' in filter) {
          acquireCount += 1;
          return acquireCount === 1
            ? queryChain(
                Promise.resolve({
                  email: 'new@gogocash.co',
                  activeTokenHash: 'previous-active-hash',
                }),
              )
            : queryChain(Promise.reject(duplicateKey));
        }
        return queryChain(
          Promise.resolve({
            email: 'new@gogocash.co',
            activeTokenHash: 'promoted-hash',
          }),
        );
      });
      let markSendStarted: () => void = () => undefined;
      const sendStarted = new Promise<void>((resolve) => {
        markSendStarted = resolve;
      });
      let acknowledgeSend: () => void = () => undefined;
      const sendAcknowledged = new Promise<void>((resolve) => {
        acknowledgeSend = resolve;
      });
      const sendEmail = jest.fn(async () => {
        markSendStarted();
        await sendAcknowledged;
      });
      const { service, tokenModel } = makeService({
        sendEmail,
        inviteState: {
          findOneAndUpdate,
        },
      });

      const leaseOwnerRequest = service.invite(
        'new@gogocash.co',
        'editor',
        actor,
      );
      await sendStarted;
      const error = await service
        .invite('new@gogocash.co', 'editor', actor)
        .catch((caught: unknown) => caught);

      expect(error).toEqual(
        expect.objectContaining({
          getStatus: expect.any(Function),
          message: expect.stringMatching(/already being sent|try again/i),
        }),
      );
      expect((error as { getStatus: () => number }).getStatus()).toBe(409);
      expect(
        (tokenModel as unknown as { create: jest.Mock }).create,
      ).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      acknowledgeSend();
      await expect(leaseOwnerRequest).resolves.toEqual(
        expect.objectContaining({ deliveryStatus: 'accepted' }),
      );
    });

    it('when delivery fails > deletes only the candidate token and preserves prior valid invites', async () => {
      const deliveryError = new Error('provider unavailable');
      const sendEmail = jest.fn().mockRejectedValue(deliveryError);
      const { service, tokenModel, inviteStateModel } = makeService({
        sendEmail,
      });

      await expect(
        service.invite('new@gogocash.co', 'editor', actor),
      ).rejects.toBe(deliveryError);

      expect(
        (tokenModel as unknown as { deleteOne: jest.Mock }).deleteOne,
      ).toHaveBeenCalledWith({ _id: 't1' });
      expect(
        (tokenModel as unknown as { deleteMany: jest.Mock }).deleteMany,
      ).not.toHaveBeenCalled();
      const findOneAndUpdate = (
        inviteStateModel as unknown as { findOneAndUpdate: jest.Mock }
      ).findOneAndUpdate;
      expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
      const leaseOwner = findOneAndUpdate.mock.calls[0][1].$set.leaseOwner;
      expect(
        (inviteStateModel as unknown as { updateOne: jest.Mock }).updateOne,
      ).toHaveBeenCalledWith(
        { email: 'new@gogocash.co', leaseOwner },
        { $set: { leaseOwner: null, leaseExpiresAt: null } },
      );
    });

    it('rejects when an admin with that email already exists', async () => {
      const { service } = makeService({
        userAdmin: {
          findOne: mockQuery({ _id: 'x' }),
        },
      });
      await expect(
        service.invite('dupe@gogocash.co', 'viewer', actor),
      ).rejects.toThrow();
    });

    it('records the verified inviter only after successful delivery and promotion', async () => {
      const append = jest.fn().mockResolvedValue(undefined);
      const { service, inviteStateModel } = makeService({ append });

      await service.invite('new@gogocash.co', 'editor', actor);

      expect(append).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_type: 'admin',
          actor_id: actor.id,
          actor_label: actor.label,
          action: 'admin_user.invited',
          summary: expect.not.stringContaining(actor.id),
        }),
      );
      const promote = (
        inviteStateModel as unknown as { findOneAndUpdate: jest.Mock }
      ).findOneAndUpdate;
      expect(promote.mock.invocationCallOrder[1]).toBeLessThan(
        append.mock.invocationCallOrder[0],
      );
    });
  });

  describe('acceptInvite', () => {
    it('creates the admin with the invited role + hashed password and consumes the token', async () => {
      const raw = 'rawtoken123';
      const append = jest.fn().mockResolvedValue(undefined);
      const { service, userAdminModel, tokenModel } = makeService({
        append,
        token: {
          findOne: mockQuery({
            _id: 't1',
            email: 'new@gogocash.co',
            role: 'editor',
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
      expect(append).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_type: 'admin',
          actor_id: 'a1',
          actor_label: 'new@gogocash.co',
          action: 'admin_user.accepted_invite',
        }),
      );
    });

    it('accepts invites when the submitted email casing differs from the stored token', async () => {
      const raw = 'rawtoken123';
      const { service } = makeService({
        token: {
          findOne: mockQuery({
            _id: 't1',
            email: 'lady.kirsah@gmail.com',
            role: 'editor',
          }),
        },
      });

      await expect(
        service.acceptInvite({
          token: raw,
          email: 'Lady.Kirsah@gmail.com',
          password: 'sup3rsecret',
        }),
      ).resolves.toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('rejects a stale invite role when authoritative state points at a replacement token', async () => {
      const raw = 'older-super-admin-token';
      const { service, userAdminModel } = makeService({
        token: {
          findOne: mockQuery({
            _id: 'old-token',
            email: 'new@gogocash.co',
            role: 'super_admin',
          }),
        },
        inviteState: {
          findOne: mockQuery({
            email: 'new@gogocash.co',
            activeTokenHash: sha256('newer-viewer-token'),
          }),
        },
      });

      await expect(
        service.acceptInvite({
          token: raw,
          email: 'new@gogocash.co',
          password: 'sup3rsecret',
        }),
      ).rejects.toThrow('Invalid or expired invitation');
      expect(
        (userAdminModel as unknown as { create: jest.Mock }).create,
      ).not.toHaveBeenCalled();
    });

    it('accepts the token selected by authoritative state', async () => {
      const raw = 'current-editor-token';
      const { service } = makeService({
        token: {
          findOne: mockQuery({
            _id: 'current-token',
            email: 'new@gogocash.co',
            role: 'editor',
          }),
        },
        inviteState: {
          findOne: mockQuery({
            email: 'new@gogocash.co',
            activeTokenHash: sha256(raw),
          }),
        },
      });

      await expect(
        service.acceptInvite({
          token: raw,
          email: 'new@gogocash.co',
          password: 'sup3rsecret',
        }),
      ).resolves.toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('rejects an otherwise valid token while authoritative state has not promoted one', async () => {
      const raw = 'unpromoted-editor-token';
      const { service, userAdminModel } = makeService({
        token: {
          findOne: mockQuery({
            _id: 'unpromoted-token',
            email: 'new@gogocash.co',
            role: 'editor',
          }),
        },
        inviteState: {
          findOne: mockQuery({
            email: 'new@gogocash.co',
            activeTokenHash: null,
          }),
        },
      });

      await expect(
        service.acceptInvite({
          token: raw,
          email: 'new@gogocash.co',
          password: 'sup3rsecret',
        }),
      ).rejects.toThrow('Invalid or expired invitation');
      expect(
        (userAdminModel as unknown as { create: jest.Mock }).create,
      ).not.toHaveBeenCalled();
    });

    it('keeps a legacy pending invite usable when no authoritative state exists', async () => {
      const raw = 'legacy-editor-token';
      const { service } = makeService({
        token: {
          findOne: mockQuery({
            _id: 'legacy-token',
            email: 'new@gogocash.co',
            role: 'editor',
          }),
        },
        inviteState: { findOne: mockQuery(null) },
      });

      await expect(
        service.acceptInvite({
          token: raw,
          email: 'new@gogocash.co',
          password: 'sup3rsecret',
        }),
      ).resolves.toEqual(
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
      const { service, sendEmail, tokenModel } = makeService({
        userAdmin: {
          findOne: mockQuery({
            _id: 'a1',
            email: 'me@gogocash.co',
            session_version: 4,
          }),
        },
      });
      await service.forgotPassword('me@gogocash.co');
      const mail = sendEmail.mock.calls[0][0];
      expect(mail.to).toBe('me@gogocash.co');
      expect(`${mail.html} ${mail.text}`).toContain('/reset-password?token=');
      expect(
        (tokenModel as unknown as { create: jest.Mock }).create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'a1',
          sessionVersion: 4,
          email: 'me@gogocash.co',
          purpose: 'reset',
        }),
      );
    });

    it('does NOT email (but still returns generic success) for an unknown email', async () => {
      const { service, sendEmail } = makeService({}); // findOne → null
      const res = await service.forgotPassword('ghost@gogocash.co');
      expect(sendEmail).not.toHaveBeenCalled();
      expect(res).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('returns the same generic success when delivery fails for a registered admin', async () => {
      const { service } = makeService({
        userAdmin: {
          findOne: mockQuery({ _id: 'a1', email: 'me@gogocash.co' }),
        },
        sendEmail: jest.fn().mockRejectedValue(new Error('provider failure')),
      });

      await expect(service.forgotPassword('me@gogocash.co')).resolves.toEqual({
        message: 'If that email is registered, a reset link has been sent.',
      });
    });
  });

  describe('resetPassword', () => {
    const resetRecord = {
      _id: 't1',
      email: 'me@gogocash.co',
      adminId: 'a1',
      sessionVersion: 4,
    };

    it('claims the token and updates the bound account generation in one transaction', async () => {
      const raw = 'resetraw';
      const { service, tokenModel, userAdminModel, appendRequired, session } =
        makeService({
          token: {
            findOneAndUpdate: mockQuery(resetRecord),
          },
          userAdmin: {
            updateOne: mockQuery({ matchedCount: 1, modifiedCount: 1 }),
          },
        });

      await service.resetPassword({
        token: raw,
        email: 'me@gogocash.co',
        password: 'brandNewPass',
      });

      const tokenClaim = (
        tokenModel as unknown as { findOneAndUpdate: jest.Mock }
      ).findOneAndUpdate.mock.calls[0];
      expect(tokenClaim[0]).toEqual(
        expect.objectContaining({
          tokenHash: sha256(raw),
          purpose: 'reset',
          email: 'me@gogocash.co',
          usedAt: null,
        }),
      );
      expect(tokenClaim[1]).toEqual({
        $set: { usedAt: expect.any(Date) },
      });
      expect(tokenClaim[2]).toEqual(
        expect.objectContaining({ new: true, session }),
      );

      const adminUpdate = (
        userAdminModel as unknown as { updateOne: jest.Mock }
      ).updateOne.mock.calls[0];
      expect(adminUpdate[0]).toEqual({ _id: 'a1', session_version: 4 });
      expect(adminUpdate[1]).toEqual({
        $set: { password: expect.any(String) },
        $inc: { session_version: 1 },
      });
      expect(
        await bcrypt.compare('brandNewPass', adminUpdate[1].$set.password),
      ).toBe(true);
      expect(adminUpdate[2]).toEqual({ session });
      expect(session.withTransaction).toHaveBeenCalledTimes(1);
      expect(session.endSession).toHaveBeenCalledTimes(1);
      expect(appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_type: 'admin',
          actor_id: 'a1',
          actor_label: 'me@gogocash.co',
          action: 'admin_user.password_reset',
        }),
        session,
      );
    });

    it('allows only one concurrent claimant to change the password', async () => {
      const claim = jest
        .fn()
        .mockImplementationOnce(() => ({
          exec: jest.fn().mockResolvedValue(resetRecord),
        }))
        .mockImplementationOnce(() => ({
          exec: jest.fn().mockResolvedValue(null),
        }));
      const updateOne = mockQuery({ matchedCount: 1, modifiedCount: 1 });
      const { service, userAdminModel } = makeService({
        token: { findOneAndUpdate: claim },
        userAdmin: { updateOne },
      });
      const input = {
        token: 'one-use-token',
        email: 'me@gogocash.co',
        password: 'brandNewPass',
      };

      const attempts = await Promise.allSettled([
        service.resetPassword(input),
        service.resetPassword(input),
      ]);

      expect(
        attempts.filter(({ status }) => status === 'fulfilled'),
      ).toHaveLength(1);
      const rejected = attempts.find(({ status }) => status === 'rejected');
      expect(rejected).toEqual(
        expect.objectContaining({
          status: 'rejected',
          reason: expect.objectContaining({
            message: 'Invalid or expired reset link',
          }),
        }),
      );

      expect(
        (userAdminModel as unknown as { updateOne: jest.Mock }).updateOne,
      ).toHaveBeenCalledTimes(1);
    });

    it('rejects a reset token after the account credential generation changes', async () => {
      const { service, appendRequired } = makeService({
        token: { findOneAndUpdate: mockQuery(resetRecord) },
        userAdmin: {
          updateOne: mockQuery({ matchedCount: 0, modifiedCount: 0 }),
        },
      });

      await expect(
        service.resetPassword({
          token: 'stale-generation-token',
          email: 'me@gogocash.co',
          password: 'brandNewPass',
        }),
      ).rejects.toThrow('Invalid or expired reset link');
      expect(appendRequired).not.toHaveBeenCalled();
    });

    it('aborts reset when its transactional audit event cannot be persisted', async () => {
      const appendRequired = jest
        .fn()
        .mockRejectedValue(new Error('audit unavailable'));
      const { service, session } = makeService({
        token: { findOneAndUpdate: mockQuery(resetRecord) },
        userAdmin: {
          updateOne: mockQuery({ matchedCount: 1, modifiedCount: 1 }),
        },
        appendRequired,
      });

      await expect(
        service.resetPassword({
          token: 'audited-reset-token',
          email: 'me@gogocash.co',
          password: 'brandNewPass',
        }),
      ).rejects.toThrow('audit unavailable');

      expect(appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin_user.password_reset' }),
        session,
      );
      expect(session.endSession).toHaveBeenCalled();
    });

    it('binds a reset link to the original admin id, not a recreated mailbox', async () => {
      const updateOne = mockQuery({ matchedCount: 0, modifiedCount: 0 });
      const { service, userAdminModel } = makeService({
        token: {
          findOneAndUpdate: mockQuery({
            ...resetRecord,
            adminId: 'deleted-admin-id',
            sessionVersion: 0,
          }),
        },
        userAdmin: { updateOne },
      });

      await expect(
        service.resetPassword({
          token: 'old-account-token',
          email: 'me@gogocash.co',
          password: 'brandNewPass',
        }),
      ).rejects.toThrow('Invalid or expired reset link');
      expect(
        (userAdminModel as unknown as { updateOne: jest.Mock }).updateOne,
      ).toHaveBeenCalledWith(
        {
          _id: 'deleted-admin-id',
          $or: [
            { session_version: 0 },
            { session_version: { $exists: false } },
          ],
        },
        expect.any(Object),
        expect.any(Object),
      );
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
