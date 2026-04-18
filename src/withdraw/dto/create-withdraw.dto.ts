import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

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
  address: string;

  @ApiProperty({ enum: ['USDT', 'USDC'] })
  @IsString()
  @IsIn(['USDT', 'USDC'])
  currency: 'USDT' | 'USDC';

  @ApiProperty({ description: 'Requested amount in the chosen token' })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class MarkWithdrawPaidDto {
  @ApiProperty({ description: 'On-chain tx hash of the admin-initiated payout' })
  @IsString()
  @IsNotEmpty()
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