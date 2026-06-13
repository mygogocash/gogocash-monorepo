/**
 * Persists missing-order form submissions so the wallet "All transactions" grid can show a row with Submitted status.
 *
 * **Storage layout**
 * - Current: `gogocash-missing-order-claims-v2:{accountKey}` where `accountKey` is the signed-in user id or `"guest"`.
 * - Legacy (migrated once for guests): `gogocash-missing-order-claims-v1` — read once when guest v2 is empty, then copied to v2 and removed.
 *
 * Same-tab updates: {@link MISSING_ORDER_CLAIM_EVENTS.updated}. Cross-tab: `storage` events on the v2 (or legacy) key.
 */

/** Unscoped key used before per-account storage; migrated to v2 for `guest` only. */
export const MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY = "gogocash-missing-order-claims-v1";

const STORAGE_PREFIX_V2 = "gogocash-missing-order-claims-v2";

/** @deprecated Use {@link MISSING_ORDER_CLAIM_EVENTS}.updated */
export const MISSING_ORDER_CLAIM_UPDATED_EVENT = "gogocash-missing-order-claim-updated";

export const MISSING_ORDER_CLAIM_EVENTS = {
  updated: MISSING_ORDER_CLAIM_UPDATED_EVENT,
} as const;

export type MissingOrderWalletClaimStored = {
  id: string;
  submittedAt: string;
  shopLabel: string;
  orderId: string;
  amount: string;
  currency: string;
};

const MAX_STORED_CLAIMS = 50;

function isStoredClaim(row: unknown): row is MissingOrderWalletClaimStored {
  if (row == null || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.submittedAt === "string" &&
    typeof r.shopLabel === "string" &&
    typeof r.orderId === "string" &&
    typeof r.amount === "string" &&
    typeof r.currency === "string"
  );
}

/** Stable localStorage key for the given account (user id or `guest`). */
export function getMissingOrderClaimStorageKey(accountKey: string): string {
  const safe = accountKey.trim() || "guest";
  return `${STORAGE_PREFIX_V2}:${safe}`;
}

export type MissingOrderClaimSessionUser =
  | {
      id?: string | null;
      _id?: string | number | null;
    }
  | null
  | undefined;

/**
 * Derives the storage partition for missing-order wallet rows from the session user.
 */
export function getMissingOrderClaimAccountKey(user: MissingOrderClaimSessionUser): string {
  const fromUnderscore =
    user?._id != null && String(user._id).trim() !== "" ? String(user._id).trim() : "";
  if (fromUnderscore) return fromUnderscore;
  const fromId = user?.id != null && String(user.id).trim() !== "" ? String(user.id).trim() : "";
  return fromId || "guest";
}

function parseClaimsAtKey(storageKey: string): MissingOrderWalletClaimStored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isStoredClaim).slice(0, MAX_STORED_CLAIMS);
  } catch {
    return [];
  }
}

function writeClaimsAtKey(storageKey: string, rows: MissingOrderWalletClaimStored[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(rows.slice(0, MAX_STORED_CLAIMS)));
}

/**
 * Reads claims for this account. Guests: migrates legacy unscoped data once into v2.
 */
export function readMissingOrderClaimsFromLocalStorage(
  accountKey: string
): MissingOrderWalletClaimStored[] {
  if (typeof window === "undefined") return [];
  const key = getMissingOrderClaimStorageKey(accountKey);
  const data = parseClaimsAtKey(key);
  if (data.length === 0 && accountKey === "guest") {
    const legacy = parseClaimsAtKey(MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY);
    if (legacy.length > 0) {
      writeClaimsAtKey(key, legacy);
      localStorage.removeItem(MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY);
      return legacy;
    }
  }
  return data;
}

export function appendMissingOrderClaimToLocalStorage(
  accountKey: string,
  payload: Omit<MissingOrderWalletClaimStored, "id"> & { id?: string }
): void {
  if (typeof window === "undefined") return;
  const id = payload.id ?? `claim-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const row: MissingOrderWalletClaimStored = {
    id,
    submittedAt: payload.submittedAt,
    shopLabel: payload.shopLabel,
    orderId: payload.orderId,
    amount: payload.amount,
    currency: payload.currency,
  };
  const key = getMissingOrderClaimStorageKey(accountKey);
  const prev = readMissingOrderClaimsFromLocalStorage(accountKey);
  const next = [row, ...prev.filter((p) => p.id !== id)].slice(0, MAX_STORED_CLAIMS);
  writeClaimsAtKey(key, next);
  window.dispatchEvent(new Event(MISSING_ORDER_CLAIM_EVENTS.updated));
}
