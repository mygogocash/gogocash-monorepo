import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import {
  Withdraw,
  WithdrawSchema,
} from 'src/withdraw/schemas/withdraw.schema';
import { OrionController } from './orion.controller';
import { OrionHealthService } from './orion-health.service';
import { OrionSnapshotService } from './orion-snapshot.service';

/**
 * ORION Phase 0 — admin health + PII-free withdraw context snapshot.
 * Vertex/Tavily are optional; default ORION_MODE=DEGRADED.
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ADMIN_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    MongooseModule.forFeature([
      { name: Withdraw.name, schema: WithdrawSchema },
    ]),
  ],
  controllers: [OrionController],
  providers: [OrionHealthService, OrionSnapshotService, AuthAdminGuard],
})
export class OrionModule {}
