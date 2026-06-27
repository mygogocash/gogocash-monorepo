import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FetchBestCommissionDto {
  @ApiProperty({ description: 'Mongo offer _id' })
  @IsString()
  @IsNotEmpty()
  offerId: string;

  @ApiProperty({ example: 'involve_asia' })
  @IsString()
  @IsNotEmpty()
  affiliateNetworkId: string;
}
