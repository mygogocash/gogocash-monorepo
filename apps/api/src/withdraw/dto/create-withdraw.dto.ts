import { ApiProperty } from '@nestjs/swagger';
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
  userid: string;
  userAddress: string;
  totalCashbackAmount: string;
  conversionIdHashes: string[];
  expireAt: string;
  chain: number;
}

export class GetWithdrawTransactionsDTO {
  page: number;
  limit: number;
  search?: string;
}

export class DataCreateRewardList {
  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ example: 1000 })
  reward: number;

  @ApiProperty({ example: 'THB' })
  currency: string;
}
export class RequestCreateRewardList {
  @ApiProperty({ example: [{ rank: 1, reward: 1000, currency: 'THB' }] })
  list: DataCreateRewardList[];
}
