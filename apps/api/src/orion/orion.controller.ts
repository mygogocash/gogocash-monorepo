import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { OrionHealthService } from './orion-health.service';
import { OrionSnapshotService } from './orion-snapshot.service';

@ApiTags('ORION')
@Controller('admin/orion')
@UseGuards(AuthAdminGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class OrionController {
  constructor(
    private readonly healthService: OrionHealthService,
    private readonly snapshotService: OrionSnapshotService,
  ) {}

  @Get('health')
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('context/snapshot')
  getContextSnapshot() {
    return this.snapshotService.getSnapshot();
  }
}
