import { CanActivate, Injectable } from '@nestjs/common';

import { PolicyAggregateService } from './policy-aggregate.service';

/**
 * Guards execute before interceptors in Nest. Keeping this capability check in
 * a guard prevents Multer from parsing or buffering a file on an unsupported
 * MongoDB topology; the service repeats the assertion as defense in depth.
 */
@Injectable()
export class PolicyTransactionCapabilityGuard implements CanActivate {
  constructor(private readonly aggregate: PolicyAggregateService) {}

  async canActivate(): Promise<boolean> {
    await this.aggregate.assertTransactionsAvailable();
    return true;
  }
}
