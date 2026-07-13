import type { ValidationPipeOptions } from '@nestjs/common';

/**
 * Global ValidationPipe options for apps/api bootstrap (#46 / V-1).
 * Integration specs must import this so they cannot drift from main.ts.
 */
export const GLOBAL_VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  // class-validator 0.15 400s decorator-less class DTOs / plain Object
  // metatypes unless this is false. Keep until every @Body() uses a class DTO.
  forbidUnknownValues: false,
};
