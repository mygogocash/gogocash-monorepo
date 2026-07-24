import { Controller, Get, Query } from '@nestjs/common';

import { ExploreDealsQueryDto, ExploreShopsQueryDto } from './dto/explore.dto';
import { ExploreService } from './explore.service';

// #586 REQ-API — public serving for Involve Xtra shops + vouchers. No auth
// (public catalog surface); the global ValidationPipe validates/caps params
// and 400s on bad input, empty result → 200 with data:[] (REQ-API-4).
@Controller('explore')
export class ExploreController {
  constructor(private readonly explore: ExploreService) {}

  @Get('shops')
  listShops(@Query() query: ExploreShopsQueryDto) {
    return this.explore.listShops(query);
  }

  @Get('deals')
  listDeals(@Query() query: ExploreDealsQueryDto) {
    return this.explore.listDeals(query);
  }
}
