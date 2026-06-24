export type CatalogStatus = "draft" | "published" | "archived";

export type CatalogBanner = {
  _id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  placement: "home_hero" | "home_grid" | "shop_list" | "product_detail" | "modal";
  locale?: string;
  device?: "all" | "mobile" | "tablet" | "desktop";
  cta_type?: "none" | "shop" | "product" | "offer" | "url";
  cta_value?: string;
  priority?: number;
  status: CatalogStatus;
  starts_at?: string;
  ends_at?: string;
};

export type CatalogShop = {
  _id: string;
  brand_name: string;
  brand_slug: string;
  logo?: string;
  logo_circle?: string;
  shop_slug?: string;
  shop_status?: CatalogStatus;
  shop_visible?: boolean;
  fulfillment_owner?: "gogocash";
  support_email?: string;
  support_url?: string;
};

export type CatalogProductVariant = {
  sku: string;
  title?: string;
  price_amount: number;
  currency: string;
  inventory_quantity: number;
  reserved_quantity?: number;
  active?: boolean;
};

export type CatalogProduct = {
  _id: string;
  title: string;
  slug: string;
  brand_id: string;
  shop_slug?: string;
  default_sku: string;
  price_amount: number;
  currency: string;
  inventory_quantity: number;
  reserved_quantity?: number;
  images?: string[];
  variants?: CatalogProductVariant[];
  status: CatalogStatus;
  scheduled_start_at?: string;
  scheduled_end_at?: string;
};

export type CommerceOrder = {
  _id: string;
  order_number: string;
  user_id: string;
  status: "pending_payment" | "paid" | "processing" | "fulfilled" | "cancelled" | "refunded";
  payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded";
  currency: string;
  total_amount: number;
  checkout_session_id?: string;
  createdAt?: string;
  items?: Array<{
    title: string;
    variant_sku: string;
    quantity: number;
    unit_amount: number;
    currency: string;
  }>;
};
