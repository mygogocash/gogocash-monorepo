import { Test, TestingModule } from '@nestjs/testing';
import { InvolveController } from './involve.controller';
import { InvolveService } from './involve.service';

describe('InvolveController', () => {
  let controller: InvolveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvolveController],
      providers: [InvolveService],
    }).compile();

    controller = module.get<InvolveController>(InvolveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
