import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { CustomerBillingController } from './customer-billing.controller';
import { CustomerBillingService } from './customer-billing.service';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';

function reqWithUser(sub: string): Request {
  return { user: { sub } } as unknown as Request;
}

describe('CustomerBillingController', () => {
  let controller: CustomerBillingController;
  const service = {
    createCheckoutSession: jest
      .fn()
      .mockResolvedValue({ url: 'https://checkout.test' }),
    createBillingPortalSession: jest
      .fn()
      .mockResolvedValue({ url: 'https://portal.test' }),
    getSubscriptionStatus: jest
      .fn()
      .mockResolvedValue({ enabled: true, status: 'active' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerBillingController],
      providers: [{ provide: CustomerBillingService, useValue: service }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CustomerBillingController);
  });

  it('getSubscriptionStatus > given authenticated caller > forwards caller sub to service', () => {
    controller.getSubscriptionStatus(reqWithUser('member-1'));

    expect(service.getSubscriptionStatus).toHaveBeenCalledWith('member-1');
  });
});
