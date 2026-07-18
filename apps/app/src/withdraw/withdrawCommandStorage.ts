import { Platform } from "react-native";

import type { MobileSession } from "@mobile/auth/session";

export type PendingWithdrawCommand = {
  effectFingerprint: string;
  key: string;
  userScope: string;
};

type CommandStorage = {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
};

const STORAGE_KEY = "gogocash.withdraw.pending-command.v1";
const STORE_VERSION = 2;

type PendingWithdrawCommandStore = {
  commands: PendingWithdrawCommand[];
  version: typeof STORE_VERSION;
};

let storageMutationQueue: Promise<void> = Promise.resolve();

function hashScope(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableHash(value: string): string {
  const reversed = [...value].reverse().join("");
  return `${hashScope(value)}${hashScope(reversed)}`;
}

/**
 * Persist only a one-way command fingerprint. The server still binds the key
 * to a SHA-256 effect hash, so a client-side collision fails closed with 409.
 */
export function fingerprintWithdrawEffect(value: string): string {
  return `effect-${stableHash(value)}`;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function decodeJwtAccountId(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload || typeof globalThis.atob !== "function") return null;

  try {
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const claims = JSON.parse(globalThis.atob(padded)) as Record<
      string,
      unknown
    >;
    return (
      text(claims.userId) ??
      text(claims.user_id) ??
      text(claims.sub) ??
      text(claims._id)
    );
  } catch {
    return null;
  }
}

/**
 * Scope persisted commands to the authenticated account without persisting the
 * raw account id or access token. Raw-token dev sessions omit `_id`, so their
 * stable server-issued JWT subject is used instead of hashing the rotating token.
 * The claim is only a local namespace hint; the API still authenticates the token
 * and owns the `(user_id, idempotency_key)` uniqueness boundary.
 */
export function resolveWithdrawCommandUserScope(
  session: Pick<MobileSession, "_id" | "access_token"> | null | undefined,
): string {
  const accessToken = text(session?.access_token);
  const identity =
    text(session?._id) ??
    (accessToken ? decodeJwtAccountId(accessToken) : null);
  if (!identity)
    throw new Error("A signed-in account is required to submit a withdrawal.");
  return `account-${stableHash(identity)}`;
}

async function runtimeStorage(): Promise<CommandStorage> {
  if (Platform.OS === "web") {
    const storage = globalThis.localStorage;
    if (!storage)
      throw new Error("Secure withdrawal retry storage is unavailable.");
    return {
      getItem: async (key) => storage.getItem(key),
      removeItem: async (key) => storage.removeItem(key),
      setItem: async (key, value) => storage.setItem(key, value),
    };
  }

  const secureStore = await import("expo-secure-store");
  if (
    typeof secureStore.getItemAsync !== "function" ||
    typeof secureStore.setItemAsync !== "function" ||
    typeof secureStore.deleteItemAsync !== "function"
  ) {
    throw new Error("Secure withdrawal retry storage is unavailable.");
  }
  return {
    getItem: secureStore.getItemAsync,
    removeItem: secureStore.deleteItemAsync,
    setItem: secureStore.setItemAsync,
  };
}

function parseCommand(value: unknown): PendingWithdrawCommand | null {
  if (!value || typeof value !== "object") return null;
  const command = value as Partial<PendingWithdrawCommand>;
  if (
    typeof command.effectFingerprint !== "string" ||
    !/^effect-[0-9a-f]{16}$/.test(command.effectFingerprint) ||
    typeof command.key !== "string" ||
    !/^[A-Za-z0-9._:-]{1,128}$/.test(command.key) ||
    typeof command.userScope !== "string" ||
    !/^account-[0-9a-f]{16}$/.test(command.userScope)
  ) {
    return null;
  }
  return command as PendingWithdrawCommand;
}

function commandSlot(command: PendingWithdrawCommand): string {
  return `${command.userScope}:${command.effectFingerprint}`;
}

function parseStore(raw: string | null): Map<string, PendingWithdrawCommand> {
  const commands = new Map<string, PendingWithdrawCommand>();
  if (!raw) return commands;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("The withdrawal retry storage is corrupted.");
  }

  // v1 stored one command directly. Treat it as a one-entry collection so the
  // next write or clear migrates it without losing an uncertain request.
  const legacyCommand = parseCommand(value);
  if (legacyCommand) {
    commands.set(commandSlot(legacyCommand), legacyCommand);
    return commands;
  }

  if (
    !value ||
    typeof value !== "object" ||
    (value as Partial<PendingWithdrawCommandStore>).version !== STORE_VERSION ||
    !Array.isArray((value as Partial<PendingWithdrawCommandStore>).commands)
  ) {
    throw new Error("The withdrawal retry storage is corrupted.");
  }

  for (const candidate of (value as PendingWithdrawCommandStore).commands) {
    const command = parseCommand(candidate);
    if (!command) {
      throw new Error("The withdrawal retry storage is corrupted.");
    }
    const slot = commandSlot(command);
    const existing = commands.get(slot);
    if (existing && existing.key !== command.key) {
      throw new Error("The withdrawal retry storage is corrupted.");
    }
    commands.set(slot, command);
  }
  return commands;
}

function serializeStore(commands: Map<string, PendingWithdrawCommand>): string {
  const store: PendingWithdrawCommandStore = {
    commands: [...commands.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, command]) => command),
    version: STORE_VERSION,
  };
  return JSON.stringify(store);
}

function mutateStorage<T>(work: () => Promise<T>): Promise<T> {
  const result = storageMutationQueue.then(work);
  storageMutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function readPendingWithdrawCommand(
  userScope: string,
  effectFingerprint: string,
  storage?: CommandStorage,
): Promise<PendingWithdrawCommand | null> {
  const resolvedStorage = storage ?? (await runtimeStorage());
  const commands = parseStore(await resolvedStorage.getItem(STORAGE_KEY));
  return commands.get(`${userScope}:${effectFingerprint}`) ?? null;
}

export async function writePendingWithdrawCommand(
  command: PendingWithdrawCommand,
  storage?: CommandStorage,
): Promise<PendingWithdrawCommand> {
  if (!parseCommand(command)) {
    throw new Error("The withdrawal retry command is invalid.");
  }
  const resolvedStorage = storage ?? (await runtimeStorage());
  return mutateStorage(async () => {
    const commands = parseStore(await resolvedStorage.getItem(STORAGE_KEY));
    const slot = commandSlot(command);
    const existing = commands.get(slot);
    if (existing) return existing;

    commands.set(slot, command);
    await resolvedStorage.setItem(STORAGE_KEY, serializeStore(commands));
    return command;
  });
}

export async function clearPendingWithdrawCommand(
  userScope: string,
  effectFingerprint: string,
  expectedKey: string,
  storage?: CommandStorage,
): Promise<void> {
  const resolvedStorage = storage ?? (await runtimeStorage());
  await mutateStorage(async () => {
    const commands = parseStore(await resolvedStorage.getItem(STORAGE_KEY));
    const slot = `${userScope}:${effectFingerprint}`;
    const current = commands.get(slot);
    if (current?.key !== expectedKey) return;

    commands.delete(slot);
    if (commands.size === 0) {
      await resolvedStorage.removeItem(STORAGE_KEY);
      return;
    }
    await resolvedStorage.setItem(STORAGE_KEY, serializeStore(commands));
  });
}

export const withdrawCommandStorageKey = STORAGE_KEY;
