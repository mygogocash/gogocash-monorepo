import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';

import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { Roles } from 'src/admin/roles.decorator';
import { RolesGuard } from 'src/admin/roles.guard';

import {
  PolicyQaFailureInjectionDisarmDto,
  PolicyQaFailureInjectionDto,
} from './dto/policy-qa-failure-injection.dto';
import { PolicyQaFailureInjectionGuard } from './policy-qa-failure-injection.guard';
import { PolicyQaFailureInjectionHook } from './policy-qa-failure-injection.hook';

@Controller('policy/qa/failure-injection')
@UseGuards(AuthAdminGuard, RolesGuard, PolicyQaFailureInjectionGuard)
@Roles('support')
export class PolicyQaFailureInjectionController {
  constructor(private readonly hook: PolicyQaFailureInjectionHook) {}

  @Post()
  arm(@Body() dto: PolicyQaFailureInjectionDto) {
    return this.hook.armOneShot(dto);
  }

  @Delete()
  disarm(@Body() dto: PolicyQaFailureInjectionDisarmDto) {
    return {
      disarmed: this.hook.disarm(dto),
      environment: dto.environment,
      candidate_sha: dto.candidate_sha,
      marker: dto.marker,
      request_key: dto.request_key,
    };
  }
}
