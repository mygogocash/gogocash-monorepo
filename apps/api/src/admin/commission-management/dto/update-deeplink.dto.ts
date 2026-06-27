import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class UpdateCommissionDeeplinkDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  offerId: string;

  @ApiProperty({ description: 'GoGoCash app tracking link for this offer' })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  deeplink: string;
}
