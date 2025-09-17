import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { InvolveModule } from 'src/involve/involve.module';

@Module({
  imports: [InvolveModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
