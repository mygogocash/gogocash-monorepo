import { Logger } from '@nestjs/common';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { CreateWithdrawDto } from './create-withdraw.dto';
import { IsBoolean, IsString, Matches } from 'class-validator';

const compatibilityLogger = new Logger('WithdrawMethodCompatibility');

function normalizeAccountNumber(value: unknown): unknown {
  if (typeof value !== 'number') return value;
  if (!Number.isFinite(value) || !Number.isSafeInteger(value) || value < 0) {
    return value;
  }

  compatibilityLogger.log({
    count: 1,
    event: 'withdraw_method_legacy_account_number',
  });
  return String(value);
}

export class UpdateWithdrawDto extends PartialType(CreateWithdrawDto) {}

export class CreateWithdrawMethod {
  @Transform(({ value }) => normalizeAccountNumber(value))
  @IsString()
  @Matches(/^[0-9]+$/)
  @ApiProperty({ type: String, example: '0012345678' })
  account_no: string;

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
