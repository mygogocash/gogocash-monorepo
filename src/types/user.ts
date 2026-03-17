export interface UserForm {
  id: string;
  mobile: string;
  username: string;
  email: string;
  address: string;
  birthdate: string;
  country: string;
  gender: string;
  /** Bank account holder name */
  bank_account_name?: string;
  /** Bank name */
  bank_name?: string;
  /** Bank account number */
  bank_account_number?: string;
  /** Wallet address or wallet type (e.g. PromptPay, crypto address) */
  wallet_info?: string;
}

export interface MyCashbackResponse {
    _id:                 string;
    metadata:            Metadata;
    flags:               Flags;
    buyerToken:          string;
    pictureProfile:      null;
    firstName:           string;
    lastName:            string;
    email:               string;
    emailVerified:       boolean;
    phoneNumber:         string;
    phoneNumberVerified: boolean;
    gender:              string;
    dateOfBirth:         null;
    lineIdentity:        string;
    facebookIdentity:    string;
    instagramIdentity:   string;
    twitterIdentity:     string;
    rating:              number;
    creditScoreType:     number;
    withdrawalPassword:  null;
    binded:              boolean;
    note:                string;
    banned:              boolean;
    bannedNote:          string;
    address:             string;
    city:                string;
    zipCode:             string;
    isReSeller:          boolean;
    buyerId:             string;
    publisherId:         string;
    balance:             Balance[];
    createdAt:           Date;
    updatedAt:           Date;
    __v:                 number;
}

export interface Balance {
    amount:      number;
    currency:    string;
    countryCode: string;
    lastUpdated: Date;
    _id:         string;
}

export interface Flags {
    hasRequestTNGDToken:     boolean;
    isRedirectedFromBrowser: boolean;
}

export interface Metadata {
    currentLanguage:            null;
    firstTimeBonusAmount:       number;
    gotFirstTimeBonus:          boolean;
    joinedStairSequenceBonus:   boolean;
    joinedStairSequenceBonusAt: null;
    joinedVipBonus:             boolean;
    joinedVipBonusAt:           null;
    expiredVipBonusAt:          null;
}
