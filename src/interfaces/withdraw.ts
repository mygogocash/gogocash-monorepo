export interface ResponseWithdrawCheck {
  totalPayoutTHB: number;
  totalPayoutUSD: number;
  netAmountTHB: number;
  netAmount: number;
  feeAmountTHB: number;
  feeAmount: number;
  feePercentage: number;
  data: DataWithdrawCheck[];
  fee: FeeData;
  payoutTotalCutFeeUSD: number;
  payoutTotalCutFeeTHB: number;
  availableWithdrawMCBTHB: number;
  availableWithdrawMCBUSD: number;
  MCBCashback: ResMCBCashbackSummary;
}
export interface ResMCBCashbackSummary {
  totalMyCashbackTHB: number;
  totalMyCashbackUSD: number;
  availableUSD: number;
  availableTHB: number;
  fee: FeeData;
  conversionIdMyCashback: string[];
}
export interface FeeData {
  _id: string;
  system: number;
  // store: number;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  // minimum_withdraw: number;
  minimum_withdraw_usd: number;
  minimum_withdraw_thb: number;
  fee_withdraw_usd: number;
  fee_withdraw_thb: number;
}

export interface DataWithdrawCheck {
  conversion_id: number;
  offer_id: number;
  aff_sub1: string;
  aff_sub2: null;
  aff_sub3: null;
  aff_sub4: null;
  aff_sub5: null;
  adv_sub1: string;
  adv_sub2: string;
  adv_sub3: string;
  adv_sub4: string;
  adv_sub5: string;
  datetime_conversion: Date;
  conversion_status: string;
  affiliate_remarks: null;
  currency: string;
  sale_amount: string;
  payout: string;
  base_payout: string;
  bonus_payout: string;
  merchant_id: number;
  offer_name: string;
}

export interface ResWithdrawBankTransfer {
  message: string;
  data: DataBankTransfer;
  status: string;
}

export interface DataBankTransfer {
  address: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  amount_total: number;
  amount_net: number;
  percent_fee: number;
  status: string;
  method: string;
  tx_hash: string;
  tx_hash_record: string;
  user_id: string;
  conversion_id: number[];
  currency: string;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface ResponseWithdrawHistory {
  data: DataWithdrawHistory[];
  pagination: Pagination;
  totalAmount: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface DataWithdrawHistory {
  _id: string;
  address: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  amount_total: number;
  amount_net: number;
  percent_fee: number;
  status: string;
  method: string;
  tx_hash: string;
  user_id: string;
  conversion_id: number[];
  mycashback_id: string[];
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResConversionHistory {
  data: ConversionHistory[];
  pagination: Pagination;
  totalUSD: { approved: number; pending: number };
  totalTHB: { approved: number; pending: number };
}

export interface ConversionHistory {
  conversion_id: number;
  offer_id: number;
  aff_sub1: string;
  aff_sub2: null;
  aff_sub3: null;
  aff_sub4: null;
  aff_sub5: null;
  adv_sub1: string;
  adv_sub2: string;
  adv_sub3: string;
  adv_sub4: string;
  adv_sub5: string;
  datetime_conversion: Date;
  conversion_status: string;
  affiliate_remarks: null;
  currency: string;
  sale_amount: string;
  payout: string;
  base_payout: string;
  bonus_payout: string;
  merchant_id: number;
  offer_name: string;
}

export interface Pagination {
  total: number;
  limit: number;
  page: number;
  totalPages: number;
}

export interface ResponseBankList {
  code: string;
  shortName: string;
  nameEn: string;
  nameTh: string;
}

export interface RequestCreateMethodWithdraw {
  account_no: string;
  account_name: string;
  bank_name: string;
  bank_code: string;
  is_default: boolean;
}

export interface RequestUpdateMethodWithdraw extends RequestCreateMethodWithdraw {
  _id: string;
}

export interface ResponseCreateMethodWithdraw {
  message: string;
  data: DataMethodWithdraw;
  status: string;
}

export interface DataMethodWithdraw {
  _id: string;
  account_no: string;
  account_name: string;
  bank_name: string;
  bank_code: string;
  is_default: boolean;
  user_id: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface ResGetSummaryListCheck {
  totalsByStatusAndCurrency: TotalsByStatusAndCurrency[];
  data: Data;
  fee: FeeData;
}

export interface Data {
  approved: Approved;
  pending: Approved;
  rejected: Approved;
}

export interface Approved {
  count: number;
  totalPayout: number;
  items: Item[];
}

export interface Item {
  _id: string;
  conversion_id: number;
  __v: number;
  adv_sub1: string;
  adv_sub2: string;
  adv_sub3: string;
  adv_sub4: string;
  adv_sub5: string;
  aff_sub1: string;
  aff_sub2: null;
  aff_sub3: null;
  aff_sub4: null;
  aff_sub5: null;
  affiliate_remarks: null;
  base_payout: number;
  bonus_payout: number;
  conversion_status: string;
  createdAt: Date;
  currency: string;
  datetime_conversion: Date;
  merchant_id: number;
  offer_id: number;
  offer_name: string;
  payout: number;
  sale_amount: number;
  updatedAt: Date;
}

export interface TotalsByStatusAndCurrency {
  status: string;
  count: number;
  totalPayout: number;
  currencyBreakdown: CurrencyBreakdown[];
  totalUSD: number;
  totalTHB: number;
}

export interface CurrencyBreakdown {
  currency: string;
  amount: number;
  usdAmount: number;
  thbAmount: number;
}
