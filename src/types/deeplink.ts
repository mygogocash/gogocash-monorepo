export interface ResponseDeeplink {
    _id:         string;
    offer_id:    number;
    merchant_id: number;
    user_id:     string;
    deeplink:    string;
    createdAt:   Date;
    updatedAt:   Date;
    __v:         number;
    offer:       Offer;
    user:        User;
}

export interface Offer {
    _id:                     string;
    offer_id:                number;
    __v:                     number;
    categories:              string;
    commission_tracking:     string;
    commissions:             Commission[];
    countries:               string;
    currency:                string;
    datetime_created:        Date;
    datetime_updated:        Date;
    description:             string;
    directory_page:          string;
    is_require_approval:     number;
    logo:                    string;
    lookup_value:            string;
    marketplace_store_offer: boolean;
    merchant_id:             number;
    offer_name:              string;
    payment_terms:           number;
    preview_url:             string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    special_commissions:     any[];
    tracking_link:           string;
    tracking_type:           string;
    validation_terms:        number;
    logo_desktop:            string;
    logo_mobile:             string;
    disabled:                boolean;
    logo_circle:             string;
    offer_name_display:      string;
    commission_store:        number;
    max_cap:                 number;
    updatedAt:               Date;
    type:                    string;
    extra_store:             boolean;
    banner:                  string;
    banner_mobile:           string;
}

export interface Commission {
    "Base Commission (Only apply for the products in subsidy list)"?: string;
    "Brand Commission"?:                                              string;
}

export interface User {
    _id:          string;
    id_firebase:  string;
    __v:          number;
    address:      string;
    country:      string;
    createdAt:    Date;
    email:        string;
    id_crossmint: string;
    id_twitter:   string;
    provider:     string;
    updatedAt:    Date;
    username:     string;
    mobile:       string;
}
