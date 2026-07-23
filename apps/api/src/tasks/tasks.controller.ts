import { Controller, Get, Logger, Param, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AffiliateProviderRegistry } from 'src/affiliate/affiliate-provider.registry';
import { syncEnabledAffiliateProviders } from 'src/affiliate/affiliate-sync.util';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { RateLimit } from 'src/auth/rate-limit.decorator';

function isFirebaseCronSecret(id: string): boolean {
  const secret = process.env.FIREBASE_API_KEY;
  return Boolean(secret) && id === secret;
}

// ScheduleModule (in-process @Cron) is the real scheduler. These HTTP routes
// are admin break-glass only — the previous `id == FIREBASE_API_KEY` gate was
// a PUBLIC client key (effectively unauthenticated money mutation), so the
// whole controller is now behind a real admin JWT + rate limit.
@UseGuards(AuthAdminGuard, RateLimitGuard)
@RateLimit({ windowMs: 60_000, max: 10 })
@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly registry: AffiliateProviderRegistry,
    private readonly jobService: JobService,
    private readonly withdrawService: WithdrawService,
  ) {}

  @Get('update-offers/:id')
  async updateOffers(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    // Break-glass manual trigger of the offer-sync that the monthly cron runs.
    // Same registry dispatch, error-isolated per provider.
    await syncEnabledAffiliateProviders(this.registry, this.logger);
  }

  @Get('update-points/:id')
  async updatePoints(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }

    return this.tasksService.awardApprovedConversionPoints();
  }

  @Get('update-conversions/:id')
  async updateConversions(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    await this.jobService.syncConversion();
  }

  @Get('update-conversions-reward/:id')
  async addConversionReward(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    await this.withdrawService.adminAddRewardConversionForQuest();
  }

  @Get('update-conversions-paid-to-approved/:id')
  async changeConversionPaid(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    await this.tasksService.changeConversionPaid();
  }

  @Get('update-status-conversions-is-pending/:id')
  async updateStatusConversionIsPending(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    return await this.tasksService.updateStatusConversionIsPending();
  }

  @Get('get-spacial-point-next-round/:id')
  async getSpacialPointNextRound(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    return this.tasksService.getSpacialPointNextRound();
  }
}
