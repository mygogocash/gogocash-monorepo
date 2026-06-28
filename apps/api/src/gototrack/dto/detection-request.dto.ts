import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export const detectionMethods = [
  'android_package',
  'browser_url',
  'notification',
  'screenshot_ocr',
  'manual',
] as const;

export const detectionPlatforms = ['android', 'ios', 'web', 'line'] as const;

export type DetectionMethod = (typeof detectionMethods)[number];
export type DetectionPlatform = (typeof detectionPlatforms)[number];

export class DetectionRequestDto {
  @ApiProperty({ enum: detectionMethods })
  @IsIn(detectionMethods)
  method: DetectionMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notificationText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  screenshotJobId?: string;

  @ApiProperty()
  @IsISO8601()
  observedAt: string;

  @ApiProperty({ enum: detectionPlatforms })
  @IsIn(detectionPlatforms)
  platform: DetectionPlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appVersion?: string;
}
