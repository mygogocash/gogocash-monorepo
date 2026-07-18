import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Body for POST /withdraw (on-chain) and /withdraw/bank-transfer. Every field is
 * optional (different methods populate different subsets), but when present the
 * money fields are now validated (V-1) so the global ValidationPipe rejects
 * negative/garbage amounts and unsupported currencies. The real payout ceiling
 * is still enforced server-side by the balance gate (V-2) — Max here is only a
 * coarse overflow guard, not the spendable limit.
 */
export class CreateWithdrawDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tx_hash?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  account_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  account_number?: string;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  conversion_ids?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percent_fee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  amount_total?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(100_000_000)
  amount_net?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({ required: false, enum: ['THB', 'USD', 'USDT', 'USDC'] })
  @IsOptional()
  @IsIn(['THB', 'USD', 'USDT', 'USDC'])
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  chain?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mycashback_id?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  /** Optional marketing withdraw-fee coupon code (bank transfer MVP). */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'coupon_code must be alphanumeric',
  })
  coupon_code?: string;
}

export class PreviewWithdrawFeeDto {
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(100_000_000)
  amount!: number;

  @ApiProperty({ required: false, enum: ['THB', 'USD', 'USDT', 'USDC'] })
  @IsOptional()
  @IsIn(['THB', 'USD', 'USDT', 'USDC'])
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'coupon_code must be alphanumeric',
  })
  coupon_code?: string;
}

/**
 * MiniPay manual-withdraw request. The user picks USDT or USDC on Celo; an
 * admin reviews + sends the payout externally and flips the record to paid
 * via `PATCH /admin/withdraw/:id/mark-paid`. Chain is locked to Celo
 * server-side — we don't accept a chain param from the client.
 */
export class CreateManualWithdrawRequestDto {
  @ApiProperty({ description: 'User wallet address the payout should go to' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[0-9a-fA-F]{40}$/, {
    message: 'address must be a 0x-prefixed 40-char hex string',
  })
  address: string;

  @ApiProperty({ enum: ['USDT', 'USDC'] })
  @IsString()
  @IsIn(['USDT', 'USDC'])
  currency: 'USDT' | 'USDC';

  /**
   * Cap at 1_000_000 USD-equiv to avoid obviously nonsensical requests. The
   * balance check in the service enforces the real ceiling; this guards
   * against float overflow / input garbage short-circuiting validation.
   */
  @ApiProperty({
    description: 'Requested amount in the chosen token',
    minimum: 0.01,
    maximum: 1_000_000,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.01)
  @Max(1_000_000)
  amount: number;
}

export class MarkWithdrawPaidDto {
  @ApiProperty({
    description: 'On-chain tx hash of the admin-initiated payout (0x + 64 hex)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[0-9a-fA-F]{64}$/, {
    message: 'tx_hash must be a 0x-prefixed 64-char hex string',
  })
  tx_hash: string;
}

export class GETSignDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userid: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  totalCashbackAmount: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  conversionIdHashes: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expireAt: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  chain: number;
}

export class GetWithdrawTransactionsDTO {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  page: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  limit: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

export class DataCreateRewardList {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  rank: number;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber()
  reward: number;

  @ApiProperty({ example: 'THB' })
  @IsString()
  @IsNotEmpty()
  currency: string;
}
export class RequestCreateRewardList {
  @ApiProperty({ example: [{ rank: 1, reward: 1000, currency: 'THB' }] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataCreateRewardList)
  list: DataCreateRewardList[];
}
