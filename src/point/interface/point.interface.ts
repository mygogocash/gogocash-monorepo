export interface GroupedConversion {
  user_id: string;
  username: string;
  email: string;
  conversion: Conversion[];
}

export interface Conversion {
  currencyOld: Currency;
  currency: Currency;
  totalSaleAmount: number;
  items: any[];
  rate: number;
  saleAmount: number;
}

export enum Currency {
  Thb = 'THB',
  Usd = 'USD',
}
