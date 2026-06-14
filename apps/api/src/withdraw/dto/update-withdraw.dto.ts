import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateWithdrawDto } from './create-withdraw.dto';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class UpdateWithdrawDto extends PartialType(CreateWithdrawDto) {}

export class CreateWithdrawMethod {
  @IsNumber()
  @ApiProperty()
  account_no: number;

  @IsString()
  @ApiProperty()
  account_name: string;

  @IsString()
  @ApiProperty()
  bank_name: string;

  @IsString()
  @ApiProperty()
  bank_code: string;

  @IsBoolean()
  @ApiProperty()
  is_default: boolean;
}
