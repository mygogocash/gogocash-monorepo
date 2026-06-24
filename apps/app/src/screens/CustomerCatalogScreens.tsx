import { useCallback, useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import {
  addCommerceCartItem,
  createCommerceCheckoutSession,
  getCatalogHome,
  getCatalogProduct,
  getCommerceCart,
  getCommerceOrders,
} from "@mobile/catalog/api";
import type { CustomerCart, CustomerCatalogHome, CustomerCatalogProduct, CustomerOrder } from "@mobile/catalog/types";
import { useTheme } from "@mobile/theme/ThemeProvider";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

function useAsyncData<T>(load: () => Promise<T>, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load catalog.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}

export function CustomerCatalogHomeScreen() {
  const { colors } = useTheme();
  const { data, error, loading } = useAsyncData<CustomerCatalogHome>(getCatalogHome, {
    banners: [],
    shops: [],
    products: [],
  });

  return (
    <ScrollView contentContainerStyle={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Shop GoGoCash</Text>
        <Pressable onPress={() => router.push("/catalog/cart")} style={[styles.headerButton, { borderColor: colors.border }]}>
          <Text style={[styles.headerButtonText, { color: colors.ink }]}>Cart</Text>
        </Pressable>
      </View>
      {loading ? <StateText label="Loading catalog..." /> : null}
      {error ? <StateText label={error} /> : null}
      {data.banners[0] ? (
        <Pressable style={[styles.hero, { backgroundColor: colors.card }]} onPress={() => followBanner(data.banners[0].cta_type, data.banners[0].cta_value)}>
          <Image source={{ uri: data.banners[0].image_url }} style={styles.heroImage} />
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: colors.ink }]}>{data.banners[0].title}</Text>
            {data.banners[0].subtitle ? <Text style={[styles.bodyText, { color: colors.muted }]}>{data.banners[0].subtitle}</Text> : null}
          </View>
        </Pressable>
      ) : null}
      <SectionTitle title="Shops" />
      <View style={styles.horizontalList}>
        {data.shops.map((shop) => (
          <View key={shop._id} style={[styles.shopTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {shop.logo_circle || shop.logo ? <Image source={{ uri: shop.logo_circle || shop.logo }} style={styles.shopLogo} /> : null}
            <Text numberOfLines={2} style={[styles.tileTitle, { color: colors.ink }]}>{shop.brand_name}</Text>
          </View>
        ))}
      </View>
      {!loading && !data.shops.length ? <StateText label="No shops available yet." /> : null}
      <SectionTitle title="Products" />
      <View style={styles.productGrid}>
        {data.products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </View>
      {!loading && !data.products.length ? <StateText label="No published products yet." /> : null}
    </ScrollView>
  );
}

export function CustomerProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { data: product, error, loading } = useAsyncData<CustomerCatalogProduct | null>(
    () => getCatalogProduct(String(slug)),
    null,
  );
  const [adding, setAdding] = useState(false);

  async function addToCart() {
    if (!product) return;
    setAdding(true);
    try {
      await addCommerceCartItem(product._id, product.default_sku, 1);
      router.push("/catalog/cart");
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <StatePage label="Loading product..." />;
  if (error || !product) return <StatePage label={error || "Product not found."} />;

  return (
    <ScrollView contentContainerStyle={[styles.page, { backgroundColor: colors.background }]}>
      {product.images?.[0] ? <Image source={{ uri: product.images[0] }} style={styles.detailImage} /> : null}
      <Text style={[styles.title, { color: colors.ink }]}>{product.title}</Text>
      <Text style={[styles.price, { color: colors.ink }]}>{formatMoney(product.price_amount, product.currency)}</Text>
      {product.description ? <Text style={[styles.bodyText, { color: colors.muted }]}>{product.description}</Text> : null}
      <Pressable disabled={adding} onPress={addToCart} style={[styles.primaryButton, adding ? styles.disabledButton : null]}>
        <Text style={styles.primaryButtonText}>{adding ? "Adding..." : "Add to cart"}</Text>
      </Pressable>
    </ScrollView>
  );
}

export function CustomerCartScreen() {
  const { colors } = useTheme();
  const { data: cart, error, loading, refresh } = useAsyncData<CustomerCart | null>(getCommerceCart, null);
  const [checkingOut, setCheckingOut] = useState(false);

  async function checkout() {
    setCheckingOut(true);
    try {
      const session = await createCommerceCheckoutSession();
      await Linking.openURL(session.checkout_url);
    } finally {
      setCheckingOut(false);
      refresh();
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.page, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.ink }]}>Cart</Text>
      {loading ? <StateText label="Loading cart..." /> : null}
      {error ? <StateText label={error} /> : null}
      {cart?.items.map((item) => (
        <View key={`${item.product_id}-${item.variant_sku}`} style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.tileTitle, { color: colors.ink }]}>{item.title}</Text>
          <Text style={[styles.bodyText, { color: colors.muted }]}>Qty {item.quantity} · {formatMoney(item.unit_amount, item.currency)}</Text>
        </View>
      ))}
      {!cart?.items.length && !loading ? <StateText label="Your cart is empty." /> : null}
      {cart?.items.length ? (
        <Pressable disabled={checkingOut} onPress={checkout} style={[styles.primaryButton, checkingOut ? styles.disabledButton : null]}>
          <Text style={styles.primaryButtonText}>{checkingOut ? "Opening checkout..." : `Checkout ${formatMoney(cart.subtotal_amount, cart.currency)}`}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

export function CustomerOrdersScreen() {
  const { colors } = useTheme();
  const { data: orders, loading, error } = useAsyncData<CustomerOrder[]>(getCommerceOrders, []);
  return (
    <ScrollView contentContainerStyle={[styles.page, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.ink }]}>Orders</Text>
      {loading ? <StateText label="Loading orders..." /> : null}
      {error ? <StateText label={error} /> : null}
      {orders.map((order) => (
        <View key={order._id} style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.tileTitle, { color: colors.ink }]}>{order.order_number}</Text>
          <Text style={[styles.bodyText, { color: colors.muted }]}>{order.status.replaceAll("_", " ")} · {formatMoney(order.total_amount, order.currency)}</Text>
        </View>
      ))}
      {!orders.length && !loading ? <StateText label="No orders yet." /> : null}
    </ScrollView>
  );
}

export function CustomerCheckoutResultScreen({ status }: { status: "success" | "cancel" }) {
  return (
    <StatePage
      label={status === "success" ? "Payment received. Your order will update shortly." : "Checkout was cancelled."}
      actionLabel={status === "success" ? "View orders" : "Back to cart"}
      onAction={() => router.replace(status === "success" ? "/catalog/orders" : "/catalog/cart")}
    />
  );
}

function ProductCard({ product }: { product: CustomerCatalogProduct }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.push(`/catalog/product/${product.slug}`)} style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {product.images?.[0] ? <Image source={{ uri: product.images[0] }} style={styles.productImage} /> : <View style={[styles.productImage, { backgroundColor: colors.border }]} />}
      <Text numberOfLines={2} style={[styles.tileTitle, { color: colors.ink }]}>{product.title}</Text>
      <Text style={[styles.bodyText, { color: colors.muted }]}>{formatMoney(product.price_amount, product.currency)}</Text>
    </Pressable>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>;
}

function StateText({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.bodyText, { color: colors.muted }]}>{label}</Text>;
}

function StatePage({ label, actionLabel, onAction }: { label: string; actionLabel?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.centerPage, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.ink, textAlign: "center" }]}>{label}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function followBanner(type?: string, value?: string) {
  if (!value || type === "none") return;
  if (type === "product") router.push(`/catalog/product/${value}`);
  else if (type === "url") Linking.openURL(value);
}

const styles = StyleSheet.create({
  page: {
    gap: 20,
    padding: 20,
    paddingBottom: 48,
  },
  centerPage: {
    alignItems: "center",
    flex: 1,
    gap: 18,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
  },
  headerButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  hero: {
    borderRadius: 18,
    overflow: "hidden",
  },
  heroImage: {
    aspectRatio: 16 / 9,
    width: "100%",
  },
  heroText: {
    gap: 6,
    padding: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  horizontalList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  shopTile: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 14,
    width: 132,
  },
  shopLogo: {
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  productCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
    width: 164,
  },
  productImage: {
    aspectRatio: 1,
    borderRadius: 10,
    width: "100%",
  },
  detailImage: {
    aspectRatio: 1.15,
    borderRadius: 18,
    width: "100%",
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0064D6",
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
