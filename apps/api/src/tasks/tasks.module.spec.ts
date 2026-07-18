import { MODULE_METADATA } from '@nestjs/common/constants';
import { getModelToken } from '@nestjs/mongoose';
import { AdminActivityModule } from 'src/admin/activity/admin-activity.module';
import { WalletAdjustment } from 'src/admin/wallets/schemas/wallet-adjustment.schema';
import { WithdrawFeeCoupon } from 'src/withdraw/schemas/withdraw-fee-coupon.schema';
import { WithdrawFeeCouponRedemption } from 'src/withdraw/schemas/withdraw-fee-coupon-redemption.schema';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import { TasksModule } from './tasks.module';

function collectDynamicProviderTokens(mod: unknown): unknown[] {
  const imports =
    (Reflect.getMetadata(MODULE_METADATA.IMPORTS, mod) as unknown[]) ?? [];
  const tokens: unknown[] = [];
  for (const entry of imports) {
    if (!entry || typeof entry !== 'object' || !('providers' in entry)) {
      continue;
    }
    const providers = (
      entry as { providers?: Array<{ provide?: unknown }> }
    ).providers;
    for (const provider of providers ?? []) {
      if (provider?.provide !== undefined) {
        tokens.push(provider.provide);
      }
    }
  }
  return tokens;
}

describe('TasksModule', () => {
  it('owns every mongoose/activity dependency WithdrawService needs to boot', () => {
    const providers =
      (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, TasksModule) as
        | unknown[]
        | undefined) ?? [];
    const imports =
      (Reflect.getMetadata(MODULE_METADATA.IMPORTS, TasksModule) as
        | unknown[]
        | undefined) ?? [];
    const modelTokens = collectDynamicProviderTokens(TasksModule);

    expect(providers).toContain(WithdrawService);
    expect(imports).toEqual(expect.arrayContaining([AdminActivityModule]));
    expect(modelTokens).toEqual(
      expect.arrayContaining([
        getModelToken(WithdrawFeeCoupon.name),
        getModelToken(WithdrawFeeCouponRedemption.name),
        getModelToken(WalletAdjustment.name),
      ]),
    );
  });
});
