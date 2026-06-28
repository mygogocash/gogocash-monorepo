import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Liveness probe for the platform (Railway healthcheck). Deliberately does
  // NOT touch Mongo: the connection is lazy (see app.module.ts), so the app
  // binds the port before the first DB handshake. A DB-touching probe would
  // 503 during cold start and fail the healthcheck.
  @Get('health')
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
