"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { catalogApi } from "@/lib/api/catalogApi";
import { usePermissions } from "@/hooks/usePermissions";
import type { CatalogBanner, CatalogProduct, CatalogShop, CommerceOrder } from "@/types/catalog";

type CatalogSection = "overview" | "banners" | "shops" | "products" | "inventory" | "orders";

type Props = {
  section: CatalogSection;
};

const navItems: Array<{ href: string; label: string; section: CatalogSection }> = [
  { href: "/catalog", label: "Overview", section: "overview" },
  { href: "/catalog/banners", label: "Banners", section: "banners" },
  { href: "/catalog/shops", label: "Shops", section: "shops" },
  { href: "/catalog/products", label: "Products", section: "products" },
  { href: "/catalog/inventory", label: "Inventory", section: "inventory" },
  { href: "/catalog/orders", label: "Orders", section: "orders" },
];

const statusClass = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  archived: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  pending_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  processing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  fulfilled: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  refunded: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

function StatusPill({ status }: { status: keyof typeof statusClass }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
      No {label} yet.
    </div>
  );
}

export default function CatalogManagementClient({ section }: Props) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManageCatalog = can("catalog:manage");
  const canManageOrders = can("orders:manage");
  const canRefund = can("payments:refund");
  const [draftBannerTitle, setDraftBannerTitle] = useState("");
  const [draftProductTitle, setDraftProductTitle] = useState("");

  const bannersQuery = useQuery({ queryKey: ["catalog", "banners"], queryFn: catalogApi.banners });
  const shopsQuery = useQuery({ queryKey: ["catalog", "shops"], queryFn: catalogApi.shops });
  const productsQuery = useQuery({ queryKey: ["catalog", "products"], queryFn: catalogApi.products });
  const ordersQuery = useQuery({ queryKey: ["catalog", "orders"], queryFn: catalogApi.orders });

  const banners = bannersQuery.data ?? [];
  const shops = shopsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  const createBanner = useMutation({
    mutationFn: () =>
      catalogApi.createBanner({
        title: draftBannerTitle,
        image_url: "https://gogocash.co/catalog/banner-placeholder.webp",
        placement: "home_hero",
        status: "draft",
      }),
    onSuccess: () => {
      setDraftBannerTitle("");
      queryClient.invalidateQueries({ queryKey: ["catalog", "banners"] });
    },
  });

  const createProduct = useMutation({
    mutationFn: () => {
      const firstShop = shops[0];
      if (!firstShop?._id) throw new Error("Create a shop profile before adding products.");
      return catalogApi.createProduct({
        title: draftProductTitle,
        slug: draftProductTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        brand_id: firstShop._id,
        shop_slug: firstShop.shop_slug,
        default_sku: "default",
        price_amount: 10000,
        currency: "THB",
        inventory_quantity: 10,
        status: "draft",
      });
    },
    onSuccess: () => {
      setDraftProductTitle("");
      queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
    },
  });

  const orderTotals = useMemo(
    () => ({
      pending: orders.filter((order) => order.status === "pending_payment").length,
      paid: orders.filter((order) => order.payment_status === "paid").length,
      revenue: orders.reduce((sum, order) => sum + (order.payment_status === "paid" ? order.total_amount : 0), 0),
    }),
    [orders],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
              item.section === section
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>

      {section === "overview" ? (
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryTile label="Published banners" value={banners.filter((b) => b.status === "published").length} />
          <SummaryTile label="Visible shops" value={shops.filter((s) => s.shop_visible).length} />
          <SummaryTile label="Products" value={products.length} />
          <SummaryTile label="Paid revenue" value={money(orderTotals.revenue, orders[0]?.currency || "THB")} />
        </div>
      ) : null}

      {section === "banners" || section === "overview" ? (
        <Panel title="Banners" action={canManageCatalog ? (
          <InlineCreate
            value={draftBannerTitle}
            onChange={setDraftBannerTitle}
            placeholder="Draft banner title"
            onSubmit={() => createBanner.mutate()}
            disabled={!draftBannerTitle || createBanner.isPending}
          />
        ) : null}>
          <BannerTable banners={banners} />
        </Panel>
      ) : null}

      {section === "shops" || section === "overview" ? (
        <Panel title="Shops">
          <ShopTable shops={shops} canManage={canManageCatalog} />
        </Panel>
      ) : null}

      {section === "products" || section === "inventory" || section === "overview" ? (
        <Panel title={section === "inventory" ? "Inventory" : "Products"} action={section !== "inventory" && canManageCatalog ? (
          <InlineCreate
            value={draftProductTitle}
            onChange={setDraftProductTitle}
            placeholder="Draft product title"
            onSubmit={() => createProduct.mutate()}
            disabled={!draftProductTitle || createProduct.isPending || !shops.length}
          />
        ) : null}>
          <ProductTable products={products} inventoryOnly={section === "inventory"} />
        </Panel>
      ) : null}

      {section === "orders" || section === "overview" ? (
        <Panel title="Orders">
          <OrderTable orders={orders} canManage={canManageOrders} canRefund={canRefund} />
        </Panel>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">{value}</div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InlineCreate(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="h-11 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      <button
        type="button"
        onClick={props.onSubmit}
        disabled={props.disabled}
        className="h-11 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
      >
        Add
      </button>
    </div>
  );
}

function BannerTable({ banners }: { banners: CatalogBanner[] }) {
  if (!banners.length) return <EmptyState label="banners" />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Placement</th>
            <th className="px-3 py-2">Target</th>
            <th className="px-3 py-2">Priority</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {banners.map((banner) => (
            <tr key={banner._id}>
              <td className="px-3 py-3 font-medium text-gray-900 dark:text-white/90">{banner.title}</td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{banner.placement}</td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{banner.cta_type || "none"}</td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{banner.priority ?? 0}</td>
              <td className="px-3 py-3"><StatusPill status={banner.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShopTable({ shops, canManage }: { shops: CatalogShop[]; canManage: boolean }) {
  if (!shops.length) return <EmptyState label="shops" />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2">Brand</th>
            <th className="px-3 py-2">Shop slug</th>
            <th className="px-3 py-2">Visible</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {shops.map((shop) => (
            <tr key={shop._id}>
              <td className="px-3 py-3 font-medium text-gray-900 dark:text-white/90">{shop.brand_name}</td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{shop.shop_slug || shop.brand_slug}</td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{shop.shop_visible ? "Yes" : "No"}</td>
              <td className="px-3 py-3"><StatusPill status={shop.shop_status || "draft"} /></td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{shop.fulfillment_owner || "gogocash"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!canManage ? <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Current role can preview shops but cannot edit catalog records.</p> : null}
    </div>
  );
}

function ProductTable({ products, inventoryOnly }: { products: CatalogProduct[]; inventoryOnly: boolean }) {
  if (!products.length) return <EmptyState label="products" />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2">Product</th>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Available</th>
            {!inventoryOnly ? <th className="px-3 py-2">Status</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {products.map((product) => {
            const available = Math.max(0, product.inventory_quantity - (product.reserved_quantity ?? 0));
            return (
              <tr key={product._id}>
                <td className="px-3 py-3 font-medium text-gray-900 dark:text-white/90">{product.title}</td>
                <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{product.default_sku}</td>
                <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{money(product.price_amount, product.currency)}</td>
                <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{available}</td>
                {!inventoryOnly ? <td className="px-3 py-3"><StatusPill status={product.status} /></td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OrderTable({ orders, canManage, canRefund }: { orders: CommerceOrder[]; canManage: boolean; canRefund: boolean }) {
  if (!orders.length) return <EmptyState label="orders" />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2">Order</th>
            <th className="px-3 py-2">Customer</th>
            <th className="px-3 py-2">Payment</th>
            <th className="px-3 py-2">Total</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {orders.map((order) => (
            <tr key={order._id}>
              <td className="px-3 py-3 font-medium text-gray-900 dark:text-white/90">{order.order_number}</td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{order.user_id}</td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{order.payment_status}</td>
              <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{money(order.total_amount, order.currency)}</td>
              <td className="px-3 py-3"><StatusPill status={order.status} /></td>
              <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                {canManage ? "Fulfillment enabled" : "Read only"}
                {canRefund ? " / Refund enabled" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
