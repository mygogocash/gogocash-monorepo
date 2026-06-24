import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";

import type {
  CustomerCart,
  CustomerCatalogHome,
  CustomerCatalogProduct,
  CustomerCheckoutSession,
  CustomerOrder,
} from "./types";

export async function getCatalogHome() {
  const client = await getRequiredClient();
  return client.get<CustomerCatalogHome>("/catalog/home");
}

export async function getCatalogProduct(slug: string) {
  const client = await getRequiredClient();
  return client.get<CustomerCatalogProduct>(`/catalog/products/${encodeURIComponent(slug)}`);
}

export async function getCommerceCart() {
  const client = await getRequiredClient();
  return client.get<CustomerCart>("/commerce/cart");
}

export async function addCommerceCartItem(productId: string, variantSku: string, quantity: number) {
  const client = await getRequiredClient();
  return client.post<CustomerCart>("/commerce/cart/items", {
    product_id: productId,
    variant_sku: variantSku,
    quantity,
  });
}

export async function createCommerceCheckoutSession() {
  const client = await getRequiredClient();
  return client.post<CustomerCheckoutSession>("/commerce/checkout/session", {
    idempotency_key: `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  });
}

export async function getCommerceOrders() {
  const client = await getRequiredClient();
  return client.get<CustomerOrder[]>("/commerce/orders");
}

async function getRequiredClient() {
  const client = await getSharedMobileApiClient(getMobileEnv().apiUrl);
  if (!client) {
    throw new Error("Mobile API client is not available.");
  }
  return client;
}
