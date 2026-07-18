import 'reflect-metadata';
import { Request } from 'express';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { ROLES_KEY } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';
import { CreateWithdrawFeeCouponDto } from './dto/withdraw-fee-coupon.dto';
import { WithdrawFeeCouponsController } from './withdraw-fee-coupons.controller';
import { WithdrawFeeCouponsService } from './withdraw-fee-coupons.service';

const GUARDS_METADATA = '__guards__';
const controllerPrototype = WithdrawFeeCouponsController.prototype as unknown as
  Record<string, unknown>;

function rolesOf(method: string): string[] {
  return (
    (Reflect.getMetadata(
      ROLES_KEY,
      controllerPrototype[method] as object,
    ) as string[]) ?? []
  );
}

describe('WithdrawFeeCouponsController RBAC wiring', () => {
  it('keeps authentication and role guards on the controller', () => {
    const guards =
      (Reflect.getMetadata(
        GUARDS_METADATA,
        WithdrawFeeCouponsController,
      ) as unknown[]) ?? [];

    expect(guards).toEqual(
      expect.arrayContaining([AuthAdminGuard, RolesGuard]),
    );
  });

  it.each(['create', 'update'])(
    'requires approver-or-higher metadata for %s',
    (method) => {
      expect(rolesOf(method)).toEqual(['approver']);
    },
  );

  it('keeps coupon listing available to authenticated read-only admins', () => {
    expect(rolesOf('list')).toEqual([]);
  });

  it('passes the guard-populated role to the service and ignores a body role', () => {
    const create = jest.fn();
    const controller = new WithdrawFeeCouponsController({
      create,
    } as unknown as WithdrawFeeCouponsService);
    const dto = {
      code: 'SAVE10',
      name: 'Save ten',
      discount_mode: 'percent',
      discount_value: 10,
      unlimited_quantity: false,
      quantity: 10,
      start_at: '2026-01-01T00:00:00.000Z',
      end_at: '2026-12-31T00:00:00.000Z',
      role: 'superadmin',
    } as CreateWithdrawFeeCouponDto & { role: string };
    const request = {
      user: {
        sub: 'admin-1',
        email: 'support@gogocash.co',
        role: 'support',
      },
    } as unknown as Request;

    controller.create(dto, request);

    expect(create).toHaveBeenCalledWith(
      dto,
      expect.objectContaining({
        id: 'admin-1',
        label: 'support@gogocash.co',
        role: 'support',
      }),
    );
  });
});
