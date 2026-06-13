export interface ResponseGenerateDeeplink {
  status: string;
  message: string;
  data: DataGenerateDeeplink;
}

export interface DataGenerateDeeplink {
  offer_name: string;
  offer_id: number;
  merchant_id: number;
  tracking_link: string;
}
