import { useEffect, useMemo, useState } from "react";

import { useGoGoTrackApi } from "./useGoGoTrackApi";

export type GoGoTrackMerchant = {
  id: string;
  name: string;
  enabled: boolean;
  androidPackages: string[];
  domains: string[];
  affiliateNetwork?: string;
  offerId?: number;
  networkMerchantId?: number;
};

type MerchantApi = {
  getMerchants(): Promise<unknown>;
};

type MerchantResult = {
  loading: boolean;
  merchant: GoGoTrackMerchant | null;
  merchants: GoGoTrackMerchant[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pick(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function merchantKey(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getMerchantRows(data: unknown) {
  if (Array.isArray(data)) {
    return data;
  }
  const record = asRecord(data);
  const merchants = record ? pick(record, "merchants", "items", "data") : undefined;
  return Array.isArray(merchants) ? merchants : [];
}

export function mapGoGoTrackMerchants(data: unknown): GoGoTrackMerchant[] {
  return getMerchantRows(data)
    .map((item): GoGoTrackMerchant | null => {
      const record = asRecord(item);
      if (!record) {
        return null;
      }

      const id = asString(pick(record, "merchant_id", "merchantId", "id"));
      const name = asString(pick(record, "merchant_name", "merchantName", "name")) ?? id;
      if (!id || !name) {
        return null;
      }

      const merchant: GoGoTrackMerchant = {
        id,
        name,
        enabled: pick(record, "enabled") !== false,
        androidPackages: asStringArray(pick(record, "android_packages", "androidPackages")),
        domains: asStringArray(pick(record, "domains")),
      };
      const affiliateNetwork = asString(pick(record, "affiliate_network", "affiliateNetwork"));
      const offerId = asNumber(pick(record, "offer_id", "offerId"));
      const networkMerchantId = asNumber(pick(record, "network_merchant_id", "networkMerchantId"));
      if (affiliateNetwork) {
        merchant.affiliateNetwork = affiliateNetwork;
      }
      if (offerId !== undefined) {
        merchant.offerId = offerId;
      }
      if (networkMerchantId !== undefined) {
        merchant.networkMerchantId = networkMerchantId;
      }
      return merchant;
    })
    .filter((merchant): merchant is GoGoTrackMerchant => merchant !== null);
}

export function findGoGoTrackMerchant(
  merchants: GoGoTrackMerchant[],
  merchantId: string | undefined,
) {
  const routeKey = merchantKey(merchantId);
  if (!routeKey) {
    return null;
  }
  return (
    merchants.find((merchant) => {
      return merchantKey(merchant.id) === routeKey || merchantKey(merchant.name) === routeKey;
    }) ?? null
  );
}

export function useGoGoTrackMerchants(
  merchantId?: string,
  apiOverride?: MerchantApi | null,
  enabled = true,
): MerchantResult {
  const defaultApi = useGoGoTrackApi(enabled && apiOverride === undefined);
  const api = enabled ? (apiOverride === undefined ? defaultApi : apiOverride) : null;
  const [loading, setLoading] = useState(Boolean(api));
  const [merchants, setMerchants] = useState<GoGoTrackMerchant[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!api) {
      setLoading(false);
      setMerchants([]);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    api
      .getMerchants()
      .then((data) => {
        if (!cancelled) {
          setMerchants(mapGoGoTrackMerchants(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMerchants([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api]);

  const merchant = useMemo(() => findGoGoTrackMerchant(merchants, merchantId), [
    merchantId,
    merchants,
  ]);

  return { loading, merchant, merchants };
}
