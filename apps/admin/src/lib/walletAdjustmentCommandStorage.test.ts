import { describe, expect, it } from "vitest";
import {
  clearConfirmedWalletAdjustmentCommand,
  getOrCreatePendingWalletAdjustmentCommand,
  WalletAdjustmentCommandStorageError,
} from "./walletAdjustmentCommandStorage";

class MemoryStorage {
  readonly entries = new Map<string, string>();

  getItem(key: string) {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.entries.set(key, value);
  }

  removeItem(key: string) {
    this.entries.delete(key);
  }
}

class TestLockManager {
  readonly names: string[] = [];
  maxActive = 0;
  private active = 0;
  private readonly tails = new Map<string, Promise<void>>();

  async request<T>(
    name: string,
    _options: { mode: "exclusive" },
    callback: () => Promise<T> | T,
  ): Promise<T> {
    this.names.push(name);
    const predecessor = this.tails.get(name) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = predecessor.then(() => current);
    this.tails.set(name, tail);
    await predecessor;
    this.active += 1;
    this.maxActive = Math.max(this.maxActive, this.active);
    try {
      return await callback();
    } finally {
      this.active -= 1;
      release();
      if (this.tails.get(name) === tail) this.tails.delete(name);
    }
  }
}

const actorId = "admin-1@example.com";
const rewardEffect = {
  type: "credit" as const,
  amount: 25,
  currency: "THB" as const,
  reason: "Private customer recovery reward",
};

const confirmedResponse = (command: {
  key: string;
  effectHash: string;
}) => ({
  _id: "adjustment-1",
  idempotency_key: command.key,
  idempotency_effect_hash: command.effectHash,
});

describe("wallet adjustment command storage", () => {
  it("persists only hashed actor/scope/effect identifiers and an opaque key", async () => {
    const storage = new MemoryStorage();
    const rawUserId = "customer-123@example.com";
    const command = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      rawUserId,
      rewardEffect,
      { storage, locks: null },
    );

    const durableText = [...storage.entries].flat().join("\n");
    expect(command.actorHash).toMatch(/^[a-f0-9]{64}$/);
    expect(command.scopeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(command.effectHash).toMatch(/^[a-f0-9]{64}$/);
    expect(command.key).toMatch(/^wallet-[a-f0-9]{64}$/);
    expect(durableText).not.toContain(actorId);
    expect(durableText).not.toContain(rawUserId);
    expect(durableText).not.toContain(rewardEffect.reason);
    const durableValue = JSON.parse(
      [...storage.entries.values()][0]!,
    ) as Record<string, unknown>;
    expect(Object.keys(durableValue).sort()).toEqual([
      "actorHash",
      "effectHash",
      "generation",
      "key",
      "scopeHash",
      "status",
      "version",
    ]);
    expect(durableValue).toMatchObject({
      generation: 1,
      status: "pending",
      version: 2,
    });
    expect(durableValue).not.toHaveProperty("actorId");
    expect(durableValue).not.toHaveProperty("amount");
    expect(durableValue).not.toHaveProperty("reason");
    expect(durableValue).not.toHaveProperty("userId");
  });

  it("reuses the same key after a lost response and a fresh caller", async () => {
    const storage = new MemoryStorage();
    const first = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      rewardEffect,
      { storage, locks: null },
    );
    const afterRemount = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      rewardEffect,
      { storage, locks: null },
    );

    expect(afterRemount).toEqual(first);
    expect(storage.entries.size).toBe(1);
  });

  it("serializes concurrent preparers with Web Locks and reuses the winner", async () => {
    const storage = new MemoryStorage();
    const locks = new TestLockManager();

    const [first, second] = await Promise.all([
      getOrCreatePendingWalletAdjustmentCommand(
        actorId,
        "user-1",
        rewardEffect,
        { storage, locks },
      ),
      getOrCreatePendingWalletAdjustmentCommand(
        actorId,
        "user-1",
        rewardEffect,
        { storage, locks },
      ),
    ]);

    expect(second).toEqual(first);
    expect(locks.names).toHaveLength(2);
    expect(new Set(locks.names)).toHaveLength(1);
    expect(locks.maxActive).toBe(1);
    expect(storage.entries.size).toBe(1);
  });

  it("uses a deterministic keyed-queue fallback without Web Locks", async () => {
    const storage = new MemoryStorage();

    // Separate runtime objects model callers that do not share component state.
    // The module-level queue protects same-process callers, while the derived
    // generation key also makes equivalent cross-context writes converge.
    const [first, second] = await Promise.all([
      getOrCreatePendingWalletAdjustmentCommand(
        actorId,
        "user-1",
        rewardEffect,
        { storage, locks: null },
      ),
      getOrCreatePendingWalletAdjustmentCommand(
        actorId,
        "user-1",
        rewardEffect,
        { storage, locks: null },
      ),
    ]);

    expect(second).toEqual(first);
    expect(storage.entries.size).toBe(1);
  });

  it("keeps separate pending commands for different effects", async () => {
    const storage = new MemoryStorage();
    const first = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      rewardEffect,
      { storage, locks: null },
    );
    const second = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      { ...rewardEffect, amount: 30 },
      { storage, locks: null },
    );

    expect(second.key).not.toBe(first.key);
    expect(second.storageKey).not.toBe(first.storageKey);
    expect(storage.entries.size).toBe(2);
    expect(storage.getItem(first.storageKey)).not.toBeNull();
    expect(storage.getItem(second.storageKey)).not.toBeNull();
  });

  it("scopes pending commands to the authenticated admin", async () => {
    const storage = new MemoryStorage();
    const first = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      rewardEffect,
      { storage, locks: null },
    );
    const afterAccountSwitch =
      await getOrCreatePendingWalletAdjustmentCommand(
        "admin-2@example.com",
        "user-1",
        rewardEffect,
        { storage, locks: null },
      );

    expect(afterAccountSwitch.actorHash).not.toBe(first.actorHash);
    expect(afterAccountSwitch.key).not.toBe(first.key);
    expect(afterAccountSwitch.storageKey).not.toBe(first.storageKey);
    expect(storage.entries.size).toBe(2);
  });

  it("clears pending state only after the API confirms the exact command", async () => {
    const storage = new MemoryStorage();
    const command = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      rewardEffect,
      { storage, locks: null },
    );

    expect(() =>
      clearConfirmedWalletAdjustmentCommand(
        command,
        {
          _id: "adjustment-1",
          idempotency_key: command.key,
          idempotency_effect_hash: "0".repeat(64),
        },
        { storage },
      ),
    ).toThrow(WalletAdjustmentCommandStorageError);
    expect(JSON.parse(storage.getItem(command.storageKey)!)).toMatchObject({
      generation: 1,
      status: "pending",
    });

    expect(
      clearConfirmedWalletAdjustmentCommand(
        command,
        confirmedResponse(command),
        { storage },
      ),
    ).toBe(true);
    expect(JSON.parse(storage.getItem(command.storageKey)!)).toMatchObject({
      generation: 1,
      key: command.key,
      status: "confirmed",
    });
  });

  it("advances the deterministic generation after a confirmed command", async () => {
    const storage = new MemoryStorage();
    const first = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      rewardEffect,
      { storage, locks: null },
    );
    clearConfirmedWalletAdjustmentCommand(first, confirmedResponse(first), {
      storage,
    });

    const nextIntent = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      rewardEffect,
      { storage, locks: null },
    );

    expect(nextIntent.generation).toBe(2);
    expect(nextIntent.key).not.toBe(first.key);
    expect(nextIntent.storageKey).toBe(first.storageKey);
  });

  it("does not clear a command that was conditionally replaced", async () => {
    const storage = new MemoryStorage();
    const command = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      rewardEffect,
      { storage, locks: null },
    );
    clearConfirmedWalletAdjustmentCommand(
      command,
      confirmedResponse(command),
      { storage },
    );
    const newerCommand = await getOrCreatePendingWalletAdjustmentCommand(
      actorId,
      "user-1",
      rewardEffect,
      { storage, locks: null },
    );

    expect(
      clearConfirmedWalletAdjustmentCommand(
        command,
        confirmedResponse(command),
        { storage },
      ),
    ).toBe(false);
    expect(storage.getItem(command.storageKey)).toContain(newerCommand.key);
  });

  it("fails closed when durable storage cannot retain the command", async () => {
    const unavailableStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota denied");
      },
      removeItem: () => undefined,
    };

    await expect(
      getOrCreatePendingWalletAdjustmentCommand(
        actorId,
        "user-1",
        rewardEffect,
        {
          storage: unavailableStorage,
          locks: null,
        },
      ),
    ).rejects.toBeInstanceOf(WalletAdjustmentCommandStorageError);
  });

  it("fails closed without an authenticated admin identity", async () => {
    await expect(
      getOrCreatePendingWalletAdjustmentCommand(
        " ",
        "user-1",
        rewardEffect,
        {
          storage: new MemoryStorage(),
          locks: null,
        },
      ),
    ).rejects.toBeInstanceOf(WalletAdjustmentCommandStorageError);
  });
});
