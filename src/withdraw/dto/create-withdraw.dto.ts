import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateWithdrawDto {
  tx_hash?: string;
  address?: string;
  account_name?: string;
  bank_name?: string;
  account_number?: string;
  conversion_ids?: number[];
  percent_fee?: number;
  amount_total?: number;
  amount_net?: number;
  method?: string;
  currency?: string;
  chain?: number;
  mycashback_id?: string[];
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
  @ApiProperty({ description: 'Requested amount in the chosen token', minimum: 0.01, maximum: 1_000_000 })
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