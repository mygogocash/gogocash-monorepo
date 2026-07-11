import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { RequestDataExportDto } from './dto/request-data-export.dto';
import { PdpaExportService } from './pdpa-export.service';

@ApiTags('pdpa')
@Controller('pdpa')
export class PdpaController {
  constructor(private readonly exportService: PdpaExportService) {}

  /**
   * Session-bound data export. Subject is always req.user.sub — any body id
   * fields are ignored (DTO only allows locale).
   */
  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Post('data-export')
  requestDataExport(@Req() req: Request, @Body() body: RequestDataExportDto) {
    const user = req['user'] as { sub?: string };
    const userId = user?.sub;
    if (!userId) {
      throw new Error('Authenticated subject missing');
    }
    return this.exportService.requestDataExport(userId, body.locale ?? 'en');
  }
}
