import 'reflect-metadata';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';
import { WithdrawController } from './withdraw.controller';
import { WithdrawService } from './withdraw.service';
import { AnalyticsService } from 'src/analytics/analytics.service';
import {
  CreateManualWithdrawRequestDto,
  CreateWithdrawDto,
  GETSignDTO,
  GetWithdrawTransactionsDTO,
  MarkWithdrawPaidDto,
  RequestCreateRewardList,
} from './dto/create-withdraw.dto';
import {
  CreateWithdrawMethod,
  UpdateWithdrawDto,
} from './dto/update-withdraw.dto';
import { RequestCreateConversionReward } from 'src/user/dto/create-conversion-reward.dto';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RolesGuard } from 'src/admin/roles.guard';
import { ROLES_KEY } from 'src/admin/roles.decorator';

/**
 * The controller is a thin authorization/identity boundary in front of
 * WithdrawService. The contract we test here is exactly that boundary:
 *  - WHICH user id the controller forwards (the authenticated requester's
 *    `sub` for self-service routes, the path `:userId` for admin routes), and
 *  - that money/audit-sensitive args (IDOR-scoped detail, admin id on
 *    mark-paid) are forwarded correctly.
 * The service is fully mocked so no DB/network/timer is touched.
 */
function makeService(): jest.Mocked<Partial<WithdrawService>> {
  return {
    getSign: jest.fn().mockResolvedValue('0xsignature'),
    checkWithdraw: jest.fn().mockResolvedValue({ balance: 100 }),
    listCheckWithdrawNew: jest.fn().mockResolvedValue([{ id: 'c1' }]),
    checkWithdrawMyCashback: jest.fn().mockResolvedValue({ cashback: 5 }),
    create: jest.fn().mockResolvedValue({ _id: 'w1' }),
    createManualWithdrawRequest: jest
      .fn()
      .mockResolvedValue({ _id: 'manual1', status: 'pending' }),
    markWithdrawPaid: jest.fn().mockResolvedValue({ status: 'paid' }),
    approveWithdrawRequest: jest
      .fn()
      .mockResolvedValue({ success: true, data: { status: 'approved' } }),
    createBankTransfer: jest.fn().mockResolvedValue({ _id: 'bt1' }),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    detailWithdraw: jest.fn().mockResolvedValue({ _id: 'w1' }),
    update: jest.fn().mockResolvedValue({ _id: 'w1', updated: true }),
    remove: jest.fn().mockReturnValue({ deleted: true }),
    createWithdrawMethod: jest.fn().mockResolvedValue({ _id: 'm1' }),
    getBankList: jest.fn().mockReturnValue([{ code: '004', name: 'KBANK' }]),
    getMethodId: jest.fn().mockReturnValue({ _id: 'm1' }),
    getMethodList: jest.fn().mockResolvedValue([{ _id: 'm1' }]),
    deleteMethodData: jest.fn().mockReturnValue({ deleted: true }),
    updateMethodData: jest.fn().mockReturnValue({ updated: true }),
    adminAddRewardConversionForQuest: jest.fn().mockResolvedValue({ ok: true }),
    createRewardList: jest.fn().mockResolvedValue({ created: 1 }),
    createConversionReward: jest.fn().mockResolvedValue({ created: true }),
  } as jest.Mocked<Partial<WithdrawService>>;
}

function reqWithUser(sub: string | undefined): Request {
  return {
    user: sub === undefined ? undefined : { sub },
    // Real Express requests always carry a headers object; analytics context
    // extraction reads it, so the fixture must model that.
    headers: {},
  } as unknown as Request;
}

describe('CreateWithdrawMethod account-number boundary', () => {
  const methodDto = (accountNo: unknown) =>
    plainToInstance(CreateWithdrawMethod, {
      account_no: accountNo,
      account_name: 'QA Shopper',
      bank_name: 'KBANK',
      bank_code: '004',
      is_default: false,
    });

  it('preserves a leading-zero digit string exactly', async () => {
    const dto = methodDto('0012345678');

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.account_no).toBe('0012345678');
  });

  it.each([
    [42, '42'],
    [1e3, '1000'],
  ])(
    'accepts safe legacy JSON number %p and normalizes it to %s',
    async (input, expected) => {
      const dto = methodDto(input);

      expect(await validate(dto)).toHaveLength(0);
      expect(dto.account_no).toBe(expected);
    },
  );

  it.each([
    1.5,
    -1,
    Number.MAX_SAFE_INTEGER + 1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '1e3',
    '12-34',
    ' 1234',
  ])('rejects invalid account-number input %p', async (input) => {
    const errors = await validate(methodDto(input));

    expect(errors.some((error) => error.property === 'account_no')).toBe(true);
  });

  it('records only a redacted compatibility counter for a legacy number', async () => {
    const logger = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const dto = methodDto(987654321);

    expect(await validate(dto)).toHaveLength(0);
    expect(logger).toHaveBeenCalledWith({
      count: 1,
      event: 'withdraw_method_legacy_account_number',
    });
    expect(JSON.stringify(logger.mock.calls)).not.toContain('987654321');
  });
});

describe('WithdrawController', () => {
  let controller: WithdrawController;
  let service: jest.Mocked<Partial<WithdrawService>>;
  let analytics: { capture: jest.Mock };

  beforeEach(async () => {
    service = makeService();
    analytics = { capture: jest.fn().mockResolvedValue(undefined) };
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [WithdrawController],
      providers: [
        { provide: WithdrawService, useValue: service },
        { provide: AnalyticsService, useValue: analytics },
      ],
    })
      // Guards carry real Mongoose/JWT dependencies; we test controller
      // delegation logic, not the guards themselves, so stub them to allow.
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get<WithdrawController>(WithdrawController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('withdraw_requested analytics (PDPA-safe funnel)', () => {
    const withdrawDto = () =>
      plainToInstance(CreateWithdrawDto, {
        amount_total: 750,
        method: 'bank',
        currency: 'THB',
        account_no: '0012345678',
        account_name: 'QA Shopper',
        bank_name: 'KBANK',
      });

    it('captures withdraw_requested with method + amount band after a successful create', async () => {
      await controller.create(reqWithUser('user-self'), withdrawDto());

      expect(analytics.capture).toHaveBeenCalledWith(
        'withdraw_requested',
        expect.objectContaining({ userId: 'user-self' }),
        expect.objectContaining({
          method: 'bank',
          amount_band: '500-1000',
          currency: 'THB',
        }),
      );
    });

    it('never leaks bank/account/wallet PII into the event properties', async () => {
      await controller.create(reqWithUser('user-self'), withdrawDto());

      const props = analytics.capture.mock.calls[0]?.[2] ?? {};
      for (const banned of [
        'account_no',
        'account_number',
        'account_name',
        'bank_name',
        'address',
      ]) {
        expect(props).not.toHaveProperty(banned);
      }
    });

    it('does not capture when the underlying create fails', async () => {
      (service.create as jest.Mock).mockRejectedValueOnce(new Error('boom'));

      await expect(
        controller.create(reqWithUser('user-self'), withdrawDto()),
      ).rejects.toThrow('boom');
      expect(analytics.capture).not.toHaveBeenCalled();
    });

    it('captures withdraw_requested (method bank_transfer) after a successful bank transfer', async () => {
      const dto = plainToInstance(CreateWithdrawDto, {
        amount_total: 250,
        currency: 'THB',
        account_no: '0012345678',
        account_name: 'QA Shopper',
        bank_name: 'KBANK',
      });

      await controller.createBankTransfer(
        reqWithUser('user-self'),
        dto,
        'idem-1',
      );

      expect(analytics.capture).toHaveBeenCalledWith(
        'withdraw_requested',
        expect.objectContaining({ userId: 'user-self' }),
        expect.objectContaining({
          method: 'bank_transfer',
          amount_band: '100-500',
          currency: 'THB',
        }),
      );
      const props = analytics.capture.mock.calls[0]?.[2] ?? {};
      for (const banned of [
        'account_no',
        'account_number',
        'account_name',
        'bank_name',
        'address',
      ]) {
        expect(props).not.toHaveProperty(banned);
      }
    });

    it('does not capture when the underlying bank transfer fails', async () => {
      (service.createBankTransfer as jest.Mock).mockRejectedValueOnce(
        new Error('boom'),
      );

      await expect(
        controller.createBankTransfer(
          reqWithUser('user-self'),
          withdrawDto(),
          'idem-1',
        ),
      ).rejects.toThrow('boom');
      expect(analytics.capture).not.toHaveBeenCalled();
    });
  });

  describe('checkWithdraw (self-service)', () => {
    // Self-service balance check must be scoped to the caller's own `sub`,
    // never an attacker-supplied id — this is the core money-isolation rule.
    it('checkWithdraw > given an authenticated request > then it queries the caller sub only', async () => {
      const result = await controller.checkWithdraw(reqWithUser('user-self'));

      expect(service.checkWithdraw).toHaveBeenCalledWith('user-self');
      expect(result).toEqual({ balance: 100 });
    });

    it('checkWithdraw > given a request with no user > then it forwards undefined (no cross-user leak)', async () => {
      await controller.checkWithdraw(reqWithUser(undefined));

      expect(service.checkWithdraw).toHaveBeenCalledWith(undefined);
    });
  });

  describe('checkWithdrawGGCAdmin (admin)', () => {
    // The admin variant must act on the PATH userId, not the admin's own sub —
    // otherwise admins could never inspect another member's balance.
    it('checkWithdrawGGCAdmin > given a target userId param > then it queries that userId, ignoring the admin sub', () => {
      controller.checkWithdrawGGCAdmin(reqWithUser('admin-1'), 'target-user');

      expect(service.checkWithdraw).toHaveBeenCalledWith('target-user');
      expect(service.checkWithdraw).not.toHaveBeenCalledWith('admin-1');
    });
  });

  describe('listCheckWithdraw / admin variant', () => {
    it('listCheckWithdraw > given a self request > then it uses the caller sub', () => {
      controller.listCheckWithdraw(reqWithUser('user-self'));
      expect(service.listCheckWithdrawNew).toHaveBeenCalledWith('user-self');
    });

    it('listCheckWithdrawAdmin > given a target userId > then it uses the path userId', () => {
      controller.listCheckWithdrawAdmin(reqWithUser('admin-1'), 'target-user');
      expect(service.listCheckWithdrawNew).toHaveBeenCalledWith('target-user');
    });
  });

  describe('checkWithdrawMyCashback / admin variant', () => {
    it('checkWithdrawMyCashback > given a self request > then it uses the caller sub', () => {
      controller.checkWithdrawMyCashback(reqWithUser('user-self'));
      expect(service.checkWithdrawMyCashback).toHaveBeenCalledWith('user-self');
    });

    it('checkWithdrawMyCashbackAdmin > given a target userId > then it uses the path userId', () => {
      controller.checkWithdrawMyCashbackAdmin(
        reqWithUser('admin-1'),
        'target-user',
      );
      expect(service.checkWithdrawMyCashback).toHaveBeenCalledWith(
        'target-user',
      );
    });
  });

  describe('create (withdraw)', () => {
    // A withdrawal moves money: the body must be paired with the AUTHENTICATED
    // caller's id, never a body-supplied owner, to prevent withdrawing on
    // behalf of another account.
    it('create > given a withdraw body and command key > then service receives the authenticated owner and key', async () => {
      const body: CreateWithdrawDto = { amount_net: 50, currency: 'USDT' };

      const result = await controller.create(
        reqWithUser('owner-1'),
        body,
        'onchain-command-1',
      );

      expect(service.create).toHaveBeenCalledWith(
        body,
        'owner-1',
        'onchain-command-1',
      );
      expect(result).toEqual({ _id: 'w1' });
    });
  });

  describe('approveWithdraw (admin, V-2b)', () => {
    it('approveWithdraw > given a withdraw id + admin > then service.approveWithdrawRequest is called with (id, adminSub)', () => {
      controller.approveWithdraw(reqWithUser('admin-9'), 'w-1');
      expect(service.approveWithdrawRequest).toHaveBeenCalledWith('w-1', {
        id: 'admin-9',
        label: 'admin-9',
      });
    });

    it('approveWithdraw > requires current approver authorization', () => {
      const guards =
        (Reflect.getMetadata(
          '__guards__',
          WithdrawController.prototype.approveWithdraw,
        ) as unknown[]) ?? [];
      expect(guards).toContain(AuthAdminGuard);
      expect(guards).toContain(RolesGuard);
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          WithdrawController.prototype.approveWithdraw,
        ),
      ).toEqual(['approver']);
    });
  });

  describe('createManualRequest (MiniPay manual withdraw)', () => {
    // Manual payout request is balance-gated downstream; the controller must
    // bind the request to the caller's own id so the balance check applies to
    // the right account.
    it('createManualRequest > given a manual body > then service is called with (body, callerSub)', () => {
      const body: CreateManualWithdrawRequestDto = {
        address: '0x' + 'a'.repeat(40),
        currency: 'USDT',
        amount: 12.5,
      };

      controller.createManualRequest(reqWithUser('owner-1'), body);

      expect(service.createManualWithdrawRequest).toHaveBeenCalledWith(
        body,
        'owner-1',
      );
    });
  });

  describe('markPaid (admin audit stamp)', () => {
    // The admin who confirms a payout is recorded for audit. When the request
    // carries an admin sub it must be forwarded as-is.
    it('markPaid > given an admin sub > then service.markWithdrawPaid records that admin id', () => {
      const body: MarkWithdrawPaidDto = { tx_hash: '0x' + 'b'.repeat(64) };

      controller.markPaid(reqWithUser('admin-7'), 'withdraw-1', body);

      expect(service.markWithdrawPaid).toHaveBeenCalledWith(
        'withdraw-1',
        body,
        { id: 'admin-7', label: 'admin-7' },
      );
    });

    it('markPaid > given no admin identity > then it fails closed', () => {
      const body: MarkWithdrawPaidDto = { tx_hash: '0x' + 'b'.repeat(64) };

      expect(() =>
        controller.markPaid(reqWithUser(undefined), 'withdraw-1', body),
      ).toThrow(UnauthorizedException);
      expect(service.markWithdrawPaid).not.toHaveBeenCalled();
    });

    it('markPaid > requires current approver authorization', () => {
      const guards =
        (Reflect.getMetadata(
          '__guards__',
          WithdrawController.prototype.markPaid,
        ) as unknown[]) ?? [];
      expect(guards).toEqual(
        expect.arrayContaining([AuthAdminGuard, RolesGuard]),
      );
      expect(
        Reflect.getMetadata(ROLES_KEY, WithdrawController.prototype.markPaid),
      ).toEqual(['approver']);
    });
  });

  describe('createBankTransfer', () => {
    it('createBankTransfer > given a withdraw body > then service is called with (body, callerSub)', async () => {
      const body: CreateWithdrawDto = {
        amount_net: 50,
        amount_total: 50,
        currency: 'THB',
      };

      await controller.createBankTransfer(
        reqWithUser('owner-1'),
        body,
        'idem-1',
      );

      expect(service.createBankTransfer).toHaveBeenCalledWith(
        body,
        'owner-1',
        'idem-1',
      );
    });
  });

  describe('findAll', () => {
    it('findAll > given query params and authed user > then service.findAll is called with (params, callerSub)', async () => {
      const params: GetWithdrawTransactionsDTO = { page: 2, limit: 10 };

      const result = await controller.findAll(params, reqWithUser('owner-1'));

      expect(service.findAll).toHaveBeenCalledWith(params, 'owner-1');
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('withdrawDetail (IDOR-scoped)', () => {
    // IDOR fix: the detail read MUST be scoped to the requester so a user can
    // only fetch their own withdrawal. The controller must forward the
    // requester sub as the second argument; dropping it would re-open the
    // leak of email/mobile/amount/tx_hash for ANY ObjectId.
    it('withdrawDetail > given an authed requester > then it scopes the lookup to (id, requesterSub)', () => {
      controller.withdrawDetail(reqWithUser('requester-1'), 'withdraw-42');

      expect(service.detailWithdraw).toHaveBeenCalledWith(
        'withdraw-42',
        'requester-1',
      );
    });

    it('withdrawDetail > given no user on the request > then requesterId is forwarded as undefined (service decides)', () => {
      controller.withdrawDetail(reqWithUser(undefined), 'withdraw-42');

      expect(service.detailWithdraw).toHaveBeenCalledWith(
        'withdraw-42',
        undefined,
      );
    });
  });

  describe('update / remove (id coercion)', () => {
    it('update > given an id and patch body > then service.update is called with (id, body)', async () => {
      const body: UpdateWithdrawDto = { amount_net: 99 };

      await controller.update('withdraw-1', body);

      expect(service.update).toHaveBeenCalledWith('withdraw-1', body);
    });

    // remove() coerces the route string to a number via `+id`; document that
    // contract so a future signature change can't silently pass a string.
    it('remove > given a numeric string id > then service.remove receives the coerced number', () => {
      controller.remove('15');

      expect(service.remove).toHaveBeenCalledWith(15);
      expect(typeof (service.remove as jest.Mock).mock.calls[0][0]).toBe(
        'number',
      );
    });
  });

  describe('withdraw-method routes', () => {
    it('createWithdrawMethod > given a method body > then service is called with (body, callerSub)', async () => {
      const body = {
        account_no: 123,
        account_name: 'Alice',
        bank_name: 'KBANK',
        bank_code: '004',
        is_default: false,
      } as unknown as CreateWithdrawMethod;

      await controller.createWithdrawMethod(body, reqWithUser('owner-1'));

      expect(service.createWithdrawMethod).toHaveBeenCalledWith(
        body,
        'owner-1',
      );
    });

    it('getMethodList > given an authed user > then service is scoped to the caller sub', () => {
      controller.getMethodList(reqWithUser('owner-1'));
      expect(service.getMethodList).toHaveBeenCalledWith('owner-1');
    });

    it('getMethodId > given a method id > then service.getMethodId is scoped to (id, caller sub) — IDOR guard', () => {
      const result = controller.getMethodId('m-1', reqWithUser('owner-1'));
      expect(service.getMethodId).toHaveBeenCalledWith('m-1', 'owner-1');
      expect(result).toEqual({ _id: 'm1' });
    });

    it('getBankList > then it delegates to service.getBankList', () => {
      const result = controller.getBankList();
      expect(service.getBankList).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ code: '004', name: 'KBANK' }]);
    });

    it('deleteMethodData > given a method id > then service.deleteMethodData is scoped to (id, caller sub) — IDOR guard', () => {
      controller.deleteMethodData('m-1', reqWithUser('owner-1'));
      expect(service.deleteMethodData).toHaveBeenCalledWith('m-1', 'owner-1');
    });

    it('updateMethodData > given an id and body > then service.updateMethodData is scoped to (id, caller sub, body) — IDOR guard', () => {
      const body = {
        account_no: 1,
        account_name: 'Bob',
        bank_name: 'SCB',
        bank_code: '014',
        is_default: true,
      } as unknown as CreateWithdrawMethod;

      controller.updateMethodData('m-1', body, reqWithUser('owner-1'));

      expect(service.updateMethodData).toHaveBeenCalledWith(
        'm-1',
        'owner-1',
        body,
      );
    });
  });

  describe('signature', () => {
    it('getSign > given a sign DTO > then it binds the request to the authenticated subject', () => {
      const dto: GETSignDTO = {
        userid: 'u1',
        userAddress: '0x' + 'a'.repeat(40),
        totalCashbackAmount: '100',
        conversionIdHashes: ['1'],
        expireAt: String(Math.floor(Date.now() / 1000) + 300),
        chain: 42220,
      };

      controller.getSign(reqWithUser('u1'), dto);

      expect(service.getSign).toHaveBeenCalledWith(dto, 'u1');
    });

    it('getSign > given no authenticated subject > then it forwards no fallback identity', () => {
      const dto = {
        userid: 'attacker-controlled',
        userAddress: '0x' + 'a'.repeat(40),
        totalCashbackAmount: '100',
        conversionIdHashes: ['1'],
        expireAt: String(Math.floor(Date.now() / 1000) + 300),
        chain: 42220,
      } as GETSignDTO;

      controller.getSign(reqWithUser(undefined), dto);

      expect(service.getSign).toHaveBeenCalledWith(dto, undefined);
    });
  });

  describe('admin reward routes', () => {
    it('adminAddRewardConversion > then it delegates to adminAddRewardConversionForQuest', async () => {
      await controller.adminAddRewardConversion();
      expect(service.adminAddRewardConversionForQuest).toHaveBeenCalledTimes(1);
    });

    it('createRewardList > given a reward-list body > then service.createRewardList is called with it', async () => {
      const body: RequestCreateRewardList = {
        list: [{ rank: 1, reward: 1000, currency: 'THB' }],
      };

      await controller.createRewardList(body);

      expect(service.createRewardList).toHaveBeenCalledWith(body);
    });

    it('createConversionReward > given a conversion-reward body > then service.createConversionReward is called with it', async () => {
      const body: RequestCreateConversionReward = {
        reward_type: 'quest',
        reward_amount: 100 as unknown as number,
        reward_currency: 'THB',
        user: 'email',
      };

      await controller.createConversionReward(body);

      expect(service.createConversionReward).toHaveBeenCalledWith(body);
    });
  });
});
