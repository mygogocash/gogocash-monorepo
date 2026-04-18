export interface IResponseLogin {
  message: string;
  user: User;
  token: string;
  is_new_user?: boolean;
  auth_flow?: "register" | "login";
}

export interface User {
  _id: string;
  address: string;
  __v: number;
  email: string;
  id_crossmint: string;
  id_twitter: string;
  username: string;
  country: string;
  provider?: string;
  mobile: string;
  birthdate?: string;
  gender?: string;
  id_telegram?: string;
  /** Data URL or HTTPS URL from API after profile image upload */
  avatar_url?: string | null;
  /** National ID or passport number for payouts / KYC (API may use snake_case). */
  id_number?: string;
  /** Residential or legal address — not the Web3 wallet `address` field. */
  legal_address?: string;
  /**
   * Membership tier (GoGoPass / free). When set to a premium tier, the
   * Customer App renders a gold badge + ring around the user's avatar.
   */
  membership_tier?: MembershipTier;
}

/**
 * Membership tiers drive the premium visual treatment.
 * - `"free"` / `undefined`: standard user — no badge or ring.
 * - `"gogopass"`: GoGoPass premium — gold badge + ring.
 * - Higher tiers reserved for future use.
 */
export type MembershipTier = "free" | "gogopass" | "gogopass-pro";

export interface IDataSignIn {
  access_token: string;
  expires: Expires;
  refresh_token: string;
  user: IDataSignUp;
}

export interface Expires {
  access_token: Date;
  refresh_token: Date;
}
export interface IRequestSignUp {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface IError {
  code: number;
  message: string;
}
export interface IResponseSignUp {
  success: boolean;
  error: null | IError;
  data: IDataSignUp;
}

export interface IDataSignUp {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  status: string;
  hasWeb3Wallet: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IResponseMe = IResponseSignUp;

export interface RequestSignup {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password: string;
  condition: string;
}

export interface IRequestSignInWeb3 {
  crossmintToken: string;
  message: string;
  provider: string;
  signature: string;
  walletAddress: string;
}
export interface IRequestSignIGoogle {
  idToken: string;
}

export interface IRequestSignInCrossmint {
  address: string;
  id_crossmint: string;
  email: string;
  referral_id?: string;
}

export interface IRequestSignInWeb3Crossmint {
  walletAddress: string;
  signature: string;
  message: string;
  provider: string;
  crossmintToken: string;
}

export interface ResponseWithdrawCheckMyCashback {
  totalMyCashbackTHB: number;
  totalMyCashbackUSD: number;
  availableUSD: number;
  availableTHB: number;
  conversionIdMyCashback: string[];
}
