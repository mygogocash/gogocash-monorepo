import client, { fetcher } from "@/lib/axios/client";
import type { CatalogBanner, CatalogProduct, CatalogShop, CommerceOrder } from "@/types/catalog";

export const catalogApi = {
  banners: () => fetcher("/admin/catalog/banners") as Promise<CatalogBanner[]>,
  shops: () => fetcher("/admin/catalog/shops") as Promise<CatalogShop[]>,
  products: () => fetcher("/admin/catalog/products") as Promise<CatalogProduct[]>,
  orders: () => fetcher("/admin/commerce/orders") as Promise<CommerceOrder[]>,
  createBanner: async (payload: Partial<CatalogBanner>) =>
    (await client.post("/admin/catalog/banners", payload)).data as CatalogBanner,
  createProduct: async (payload: Partial<CatalogProduct>) =>
    (await client.post("/admin/catalog/products", payload)).data as CatalogProduct,
  updateShop: async (brandId: string, payload: Partial<CatalogShop>) =>
    (await client.put(`/admin/catalog/shops/${brandId}`, payload)).data as CatalogShop,
  updateOrderStatus: (
    orderId: string,
    payload: { status: "processing" | "fulfilled" | "cancelled" | "refunded"; admin_note?: string },
  ) =>
    client
      .put(`/admin/commerce/orders/${orderId}/status`, payload)
      .then((response) => response.data as CommerceOrder),
};
