export interface ResGetConversionInWithdraw {
  status: string;
  message: string;
  data: ConversionInWithdrawList;
}

export interface ConversionInWithdrawList {
  page: number;
  limit: number;
  count: number;
  nextPage: null;
  data: ConversionInWithdraw[];
}

export interface ConversionInWithdraw {
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

export interface ResDataWithdrawsListByUser {
  totalsByStatusAndCurrency: TotalsByStatusAndCurrency[];
  data: Data;
  fee: Fee;
  withdrawList: WithdrawList[];
  allConversions: AllConversion[];
  user: User;
  withdrawSumByCurrency: ResWithdrawSumByStatus;
}
export interface ResWithdrawSumByStatus {
  [key: string]: WithdrawSumByCurrency;
}
export interface WithdrawSumByCurrency {
  [key: string]: DataSumByCurrency;
}

export interface DataSumByCurrency {
  netAmount: number;
  count: number;
}

export interface UserLogEntry {
  action?: string;
  at?: string;
  ip?: string;
}

export interface User {
  _id?: string;
  /** Login handle / display username (read-only; not editable from admin). */
  username?: string;
  /** Legacy primary email; mirrors first entry of `emails` when present */
  email?: string;
  /** Legacy primary phone; mirrors first entry of `mobiles` when present */
  mobile?: string;
  /** All known emails for this user (2–3+ supported) */
  emails?: string[];
  /** All known phone numbers for this user */
  mobiles?: string[];
  fullName?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthdate?: string;
  wallet?: string;
  /** GoGoPass membership; when omitted, UI shows an em dash until the API supplies it */
  gogopassActive?: boolean;
  userLog?: UserLogEntry[];
  totalCashback?: number;
  totalCashbackCurrency?: string;
  /** When the API exposes account lifecycle timestamps (ISO strings) */
  createdAt?: string;
  updatedAt?: string;
  /** MyCashBack / partner identifiers when merged into this profile */
  buyerId?: string;
  publisherId?: string;
  /** Street / mailing address (not crypto wallet — see `wallet`) */
  streetAddress?: string;
  city?: string;
  zipCode?: string;
  rating?: number;
  creditScoreType?: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}
export interface WithdrawList {
  _id: string;
  address: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  amount_total: number;
  amount_net: number;
  percent_fee: number;
  status: Status;
  method: string;
  tx_hash: string;
  tx_hash_record: string;
  user_id: string;
  conversion_id: number[];
  /**
   * Narrow enough to type-gate the admin UI (USDT/USDC are the MiniPay
   * manual-payout tokens; THB is retained for legacy bank_transfer rows).
   * Widened to `string` at the boundary as a defensive fallback if the API
   * returns an unexpected value — the UI validates at render time.
   */
  currency: "THB" | "USDT" | "USDC" | (string & {});
  mycashback_id: string[];
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  slip_file: string;
  /**
   * "auto" (default) — user signed the on-chain tx themselves.
   * "manual" — request submitted via MiniPay (or similar custodial flow);
   *            admin fulfils externally via PATCH /withdraw/:id/mark-paid.
   */
  withdraw_mode?: "auto" | "manual";
  /** Payout chain (e.g. "CELO") — populated on manual rows. */
  chain?: string;
  /** Admin user id who marked the manual request paid. */
  paid_by?: string;
  paid_at?: string | Date;
}
export interface AllConversion {
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
  affiliate_remarks: string;
  base_payout: number;
  bonus_payout: number;
  conversion_status: Status;
  createdAt: Date;
  currency: Currency;
  datetime_conversion: Date;
  merchant_id: number;
  offer_id: number;
  offer_name: OfferName;
  payout: number;
  sale_amount: number;
  updatedAt: Date;
}

export enum Status {
  Approved = "approved",
  Pending = "pending",
  Rejected = "rejected",
}

export enum Currency {
  Thb = "THB",
}

export enum OfferName {
  BananaITTHCPS = "Banana IT TH - CPS",
}

export interface Data {
  approved: Approved;
  pending: Approved;
  rejected: Approved;
}

export interface Approved {
  count: number;
  totalPayout: number;
  items: AllConversion[];
}

export interface Fee {
  _id: string;
  system: number;
  store: number;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  fee_withdraw_usd: number;
  fee_withdraw_thb: number;
  minimum_withdraw_thb: number;
  minimum_withdraw_usd: number;
  minimum_withdraw: number;
}

export interface TotalsByStatusAndCurrency {
  status: Status;
  count: number;
  totalPayout: number;
  currencyBreakdown: CurrencyBreakdown[];
  totalUSD: number;
  totalTHB: number;
}

export interface CurrencyBreakdown {
  currency: Currency;
  amount: number;
  usdAmount: number;
  thbAmount: number;
}

export interface ResMCBDetail {
  totalMyCashbackTHB: number;
  totalMyCashbackUSD: number;
  availableUSD: number;
  availableTHB: number;
  conversionIdMyCashback: string[];
}
