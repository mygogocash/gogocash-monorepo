import { User } from "./auth";

export interface ResGetBalanceMyCashback {
  user: User;
  userMyCashback: DataGetBalanceMyCashback[];
  sumBalance: { [key: string]: Balance };
}

export interface DataGetBalanceMyCashback {
  pictureProfile: null;
  withdrawalPassword: null;
  _id: string;
  buyerId: string;
  __v: number;
  buyerToken: string;
  createdAt: Date;
  phoneNumber: string;
  publisherId: string;
  updatedAt: Date;
  balance: Balance[];
  binded: boolean;
  email: string;
  facebookIdentity: string;
  firstName: string;
  instagramIdentity: string;
  lastName: string;
  metadata: Metadata;
  rating: number;
  twitterIdentity: string;
  address: string;
  banned: boolean;
  city: string;
  bannedNote: string;
  gender: string;
  dateOfBirth: Date;
  lineIdentity: string;
  note: string;
  zipCode: string;
  creditScoreType: number;
  isReSeller: boolean;
  emailVerified: boolean;
  phoneNumberVerified: boolean;
  flags: Flags;
}

export interface Balance {
  amount: number;
  currency: string;
  lastUpdated: Date;
  _id: string;
}

export interface Flags {
  hasRequestTNGDToken: boolean;
  isRedirectedFromBrowser: boolean;
}

export interface Metadata {
  joinedStairSequenceBonus: boolean;
  joinedVipBonus: boolean;
  gotFirstTimeBonus: boolean;
  firstTimeBonusAmount: number;
  currentLanguage: null;
  joinedStairSequenceBonusAt: null;
  joinedVipBonusAt: null;
}
