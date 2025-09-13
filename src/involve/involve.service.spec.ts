import { Test, TestingModule } from '@nestjs/testing';
import { InvolveService } from './involve.service';

describe('InvolveService', () => {
  let service: InvolveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvolveService],
    }).compile();

    service = module.get<InvolveService>(InvolveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
