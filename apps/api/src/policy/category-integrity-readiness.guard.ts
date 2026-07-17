import { CanActivate, Injectable } from '@nestjs/common';

import { CategoryIntegrityService } from './category-integrity.service';

@Injectable()
export class CategoryIntegrityReadinessGuard implements CanActivate {
  constructor(private readonly integrity: CategoryIntegrityService) {}

  async canActivate(): Promise<boolean> {
    await this.integrity.assertReady();
    return true;
  }
}
