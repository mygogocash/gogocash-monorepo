import { Module } from '@nestjs/common';
import { InvolveService } from './involve.service';
import { InvolveController } from './involve.controller';

@Module({
  controllers: [InvolveController],
  providers: [InvolveService],
})
export class InvolveModule {}
