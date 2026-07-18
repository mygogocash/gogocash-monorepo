export type WalletAdjustmentCommandEffect = Readonly<{
  type: "credit" | "debit";
  amount: number;
  currency: "THB" | "USD";
  reason: string;
}>;

export type PendingWalletAdjustmentCommand = Readonly<{
  version: 1;
  scopeHash: string;
  effectHash: string;
  key: string;
  storageKey: string;
}>;

type DurableStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type CryptoProvider = Pick<Crypto, "getRandomValues" | "subtle"> &
  Partial<Pick<Crypto, "randomUUID">>;

export type WalletAdjustmentCommandRuntime = Readonly<{
  storage?: DurableStorage;
  crypto?: CryptoProvider;
  createKey?: () => string;
}>;

const STORAGE_PREFIX = "gogocash:admin:wallet-adjustment:v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export class WalletAdjustmentCommandStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WalletAdjustmentCommandStorageError";
  }
}

function requireStorage(runtime: WalletAdjustmentCommandRuntime) {
  if (runtime.storage) return runtime.storage;
  try {
    const storage = globalThis.localStorage;
    if (!storage) throw new Error("localStorage is unavailable");
    return storage;
  } catch (cause) {
    throw new WalletAdjustmentCommandStorageError(
      "Durable wallet command storage is unavailable.",
      { cause },
    );
  }
}

function requireCrypto(runtime: WalletAdjustmentCommandRuntime) {
  const cryptoProvider = runtime.crypto ?? globalThis.crypto;
  if (!cryptoProvider?.subtle) {
    throw new WalletAdjustmentCommandStorageError(
      "Secure wallet command hashing is unavailable.",
    );
  }
  return cryptoProvider;
}

async function sha256(value: string, cryptoProvider: CryptoProvider) {
  try {
    const digest = await cryptoProvider.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } catch (cause) {
    throw new WalletAdjustmentCommandStorageError(
      "The wallet command could not be hashed securely.",
      { cause },
    );
  }
}

function canonicalEffect(effect: WalletAdjustmentCommandEffect) {
  const amount = Number(effect.amount);
  const reason = effect.reason.trim();
  if (
    (effect.type !== "credit" && effect.type !== "debit") ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (effect.currency !== "THB" && effect.currency !== "USD") ||
    !reason
  ) {
    throw new WalletAdjustmentCommandStorageError(
      "The wallet command effect is invalid.",
    );
  }
  // Keep this field order aligned with the API's idempotency-effect hash.
  return JSON.stringify({
    amount,
    currency: effect.currency,
    reason,
    type: effect.type,
  });
}

function createOpaqueKey(cryptoProvider: CryptoProvider) {
  if (typeof cryptoProvider.randomUUID === "function") {
    return cryptoProvider.randomUUID();
  }
  try {
    const bytes = cryptoProvider.getRandomValues(new Uint8Array(16));
    return `wallet-${Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")}`;
  } catch (cause) {
    throw new WalletAdjustmentCommandStorageError(
      "A secure wallet command key could not be generated.",
      { cause },
    );
  }
}

function parseStoredCommand(
  raw: string,
  expected: Pick<PendingWalletAdjustmentCommand, "scopeHash" | "effectHash">,
) {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      value.version !== 1 ||
      value.scopeHash !== expected.scopeHash ||
      value.effectHash !== expected.effectHash ||
      typeof value.key !== "string" ||
      !KEY_PATTERN.test(value.key)
    ) {
      throw new Error("Stored command has an invalid shape");
    }
    return {
      version: 1 as const,
      scopeHash: expected.scopeHash,
      effectHash: expected.effectHash,
      key: value.key,
    };
  } catch (cause) {
    throw new WalletAdjustmentCommandStorageError(
      "The pending wallet command could not be verified.",
      { cause },
    );
  }
}

async function commandIdentity(
  userId: string,
  effect: WalletAdjustmentCommandEffect,
  runtime: WalletAdjustmentCommandRuntime,
) {
  const target = userId.trim();
  if (!target) {
    throw new WalletAdjustmentCommandStorageError(
      "The wallet command target is invalid.",
    );
  }
  const cryptoProvider = requireCrypto(runtime);
  const [scopeHash, effectHash] = await Promise.all([
    sha256(`wallet-adjustment-target:v1:${target}`, cryptoProvider),
    sha256(canonicalEffect(effect), cryptoProvider),
  ]);
  return {
    cryptoProvider,
    scopeHash,
    effectHash,
    storageKey: `${STORAGE_PREFIX}:${scopeHash}:${effectHash}`,
  };
}

export async function walletAdjustmentEffectHash(
  effect: WalletAdjustmentCommandEffect,
  runtime: WalletAdjustmentCommandRuntime = {},
) {
  return sha256(canonicalEffect(effect), requireCrypto(runtime));
}

export async function getOrCreatePendingWalletAdjustmentCommand(
  userId: string,
  effect: WalletAdjustmentCommandEffect,
  runtime: WalletAdjustmentCommandRuntime = {},
): Promise<PendingWalletAdjustmentCommand> {
  const storage = requireStorage(runtime);
  const { cryptoProvider, scopeHash, effectHash, storageKey } =
    await commandIdentity(userId, effect, runtime);

  let raw: string | null;
  try {
    raw = storage.getItem(storageKey);
  } catch (cause) {
    throw new WalletAdjustmentCommandStorageError(
      "The pending wallet command could not be read.",
      { cause },
    );
  }

  if (raw !== null) {
    return {
      ...parseStoredCommand(raw, { scopeHash, effectHash }),
      storageKey,
    };
  }

  const key = runtime.createKey?.() ?? createOpaqueKey(cryptoProvider);
  if (!KEY_PATTERN.test(key)) {
    throw new WalletAdjustmentCommandStorageError(
      "The generated wallet command key is invalid.",
    );
  }
  const storedCommand = { version: 1 as const, scopeHash, effectHash, key };
  const serialized = JSON.stringify(storedCommand);
  try {
    storage.setItem(storageKey, serialized);
    const confirmed = storage.getItem(storageKey);
    if (confirmed === null) {
      throw new Error("Durable storage did not retain the command");
    }
    const verified = parseStoredCommand(confirmed, { scopeHash, effectHash });
    if (verified.key !== key) {
      throw new Error("A concurrent wallet command replaced this command");
    }
  } catch (cause) {
    if (cause instanceof WalletAdjustmentCommandStorageError) throw cause;
    throw new WalletAdjustmentCommandStorageError(
      "The pending wallet command could not be stored durably.",
      { cause },
    );
  }

  return { ...storedCommand, storageKey };
}

export function isConfirmedWalletAdjustmentResponse(
  response: unknown,
  command: PendingWalletAdjustmentCommand,
) {
  if (!response || typeof response !== "object") return false;
  const value = response as Record<string, unknown>;
  return (
    typeof value._id === "string" &&
    value._id.length > 0 &&
    value.idempotency_key === command.key &&
    value.idempotency_effect_hash === command.effectHash
  );
}

export function clearConfirmedWalletAdjustmentCommand(
  command: PendingWalletAdjustmentCommand,
  response: unknown,
  runtime: WalletAdjustmentCommandRuntime = {},
) {
  if (!isConfirmedWalletAdjustmentResponse(response, command)) {
    throw new WalletAdjustmentCommandStorageError(
      "The wallet adjustment response did not confirm this command.",
    );
  }
  if (
    !HASH_PATTERN.test(command.scopeHash) ||
    !HASH_PATTERN.test(command.effectHash)
  ) {
    throw new WalletAdjustmentCommandStorageError(
      "The pending wallet command identity is invalid.",
    );
  }

  const storage = requireStorage(runtime);
  try {
    const raw = storage.getItem(command.storageKey);
    if (raw === null) return false;
    const stored = parseStoredCommand(raw, command);
    if (stored.key !== command.key) return false;
    storage.removeItem(command.storageKey);
    if (storage.getItem(command.storageKey) !== null) {
      throw new Error("Durable storage retained the confirmed command");
    }
    return true;
  } catch (cause) {
    if (cause instanceof WalletAdjustmentCommandStorageError) throw cause;
    throw new WalletAdjustmentCommandStorageError(
      "The confirmed wallet command could not be cleared.",
      { cause },
    );
  }
}
