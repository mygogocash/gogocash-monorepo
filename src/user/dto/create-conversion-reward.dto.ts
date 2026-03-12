import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RequestCreateConversionReward {
  @ApiProperty({ example: 'quest' })
  @IsString()
  @IsNotEmpty()
  reward_type: string;

  @ApiProperty({ example: 100 })
  @IsString()
  @IsNotEmpty()
  reward_amount: number;

  @ApiProperty({ example: 'THB|USD' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['THB', 'USD'])
  reward_currency: string;

  @ApiProperty({ example: 'email|mobile' })
  @IsString()
  @IsNotEmpty()
  user: string; // Optional: specify user ID for targeted reward, if needed
}
