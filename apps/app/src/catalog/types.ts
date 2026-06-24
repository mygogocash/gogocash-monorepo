export type CatalogStatus = "draft" | "published" | "archived";

export type CustomerCatalogBanner = {
  _id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  image_alt?: string;
  placement: "home_hero" | "home_grid" | "shop_list" | "product_detail" | "modal";
  cta_type?: "none" | "shop" | "product" | "offer" | "url";
  cta_value?: string;
};

export type CustomerCatalogShop = {
  _id: string;
  brand_name: string;
  brand_slug: string;
  logo?: string;
  logo_circle?: string;
  banner?: string;
  shop_slug?: string;
  support_email?: string;
  support_url?: string;
};

export type CustomerCatalogProduct = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  brand_id: string;
  shop_slug?: string;
  default_sku: string;
  price_amount: number;
  currency: string;
  inventory_quantity: number;
  reserved_quantity?: number;
  images?: string[];
  status: CatalogStatus;
};

export type CustomerCatalogHome = {
  banners: CustomerCatalogBanner[];
  shops: CustomerCatalogShop[];
  products: CustomerCatalogProduct[];
};

export type CustomerCart = {
  _id: string;
  items: Array<{
    product_id: string;
    variant_sku: string;
    quantity: number;
    unit_amount: number;
    currency: string;
    title: string;
    image_url?: string;
  }>;
  currency: string;
  subtotal_amount: number;
};

export type CustomerOrder = {
  _id: string;
  order_number: string;
  status: "pending_payment" | "paid" | "processing" | "fulfilled" | "cancelled" | "refunded";
  payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded";
  total_amount: number;
  currency: string;
};

export type CustomerCheckoutSession = {
  order_id: string;
  order_number?: string;
  checkout_url: string;
  provider: string;
  reused: boolean;
};
