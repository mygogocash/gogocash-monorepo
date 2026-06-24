import { fetcher, fetcherPost, fetcherPut } from "@/lib/axios/client";
import type { CatalogBanner, CatalogProduct, CatalogShop, CommerceOrder } from "@/types/catalog";

export const catalogApi = {
  banners: () => fetcher("/admin/catalog/banners") as Promise<CatalogBanner[]>,
  shops: () => fetcher("/admin/catalog/shops") as Promise<CatalogShop[]>,
  products: () => fetcher("/admin/catalog/products") as Promise<CatalogProduct[]>,
  orders: () => fetcher("/admin/commerce/orders") as Promise<CommerceOrder[]>,
  createBanner: (payload: Partial<CatalogBanner>) =>
    fetcherPost(["/admin/catalog/banners", { data: payload }]) as Promise<CatalogBanner>,
  createProduct: (payload: Partial<CatalogProduct>) =>
    fetcherPost(["/admin/catalog/products", { data: payload }]) as Promise<CatalogProduct>,
  updateShop: (brandId: string, payload: Partial<CatalogShop>) =>
    fetcherPut([`/admin/catalog/shops/${brandId}`, { data: payload }]) as Promise<CatalogShop>,
  updateOrderStatus: (
    orderId: string,
    payload: { status: "processing" | "fulfilled" | "cancelled" | "refunded"; admin_note?: string },
  ) => fetcherPut([`/admin/commerce/orders/${orderId}/status`, { data: payload }]) as Promise<CommerceOrder>,
};
