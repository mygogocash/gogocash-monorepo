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
