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

const rewardEffect = {
  type: "credit" as const,
  amount: 25,
  currency: "THB" as const,
  reason: "Private customer recovery reward",
};

describe("wallet adjustment command storage", () => {
  it("persists only hashed scope/effect identifiers and an opaque key", async () => {
    const storage = new MemoryStorage();
    const rawUserId = "customer-123@example.com";
    const command = await getOrCreatePendingWalletAdjustmentCommand(
      rawUserId,
      rewardEffect,
      { storage, createKey: () => "wallet-command-1" },
    );

    const durableText = [...storage.entries].flat().join("\n");
    expect(command.scopeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(command.effectHash).toMatch(/^[a-f0-9]{64}$/);
    expect(durableText).not.toContain(rawUserId);
    expect(durableText).not.toContain(rewardEffect.reason);
    expect(durableText).toContain("wallet-command-1");
    const durableValue = JSON.parse(
      [...storage.entries.values()][0]!,
    ) as Record<string, unknown>;
    expect(Object.keys(durableValue).sort()).toEqual([
      "effectHash",
      "key",
      "scopeHash",
      "version",
    ]);
    expect(durableValue).not.toHaveProperty("amount");
    expect(durableValue).not.toHaveProperty("reason");
    expect(durableValue).not.toHaveProperty("userId");
  });

  it("reuses the same key after a lost response and a fresh caller", async () => {
    const storage = new MemoryStorage();
    const first = await getOrCreatePendingWalletAdjustmentCommand(
      "user-1",
      rewardEffect,
      { storage, createKey: () => "first-key" },
    );
    const afterRemount = await getOrCreatePendingWalletAdjustmentCommand(
      "user-1",
      rewardEffect,
      { storage, createKey: () => "must-not-be-used" },
    );

    expect(afterRemount).toEqual(first);
    expect(storage.entries.size).toBe(1);
  });

  it("keeps separate pending commands for different effects", async () => {
    const storage = new MemoryStorage();
    const first = await getOrCreatePendingWalletAdjustmentCommand(
      "user-1",
      rewardEffect,
      { storage, createKey: () => "first-key" },
    );
    const second = await getOrCreatePendingWalletAdjustmentCommand(
      "user-1",
      { ...rewardEffect, amount: 30 },
      { storage, createKey: () => "second-key" },
    );

    expect(second.key).not.toBe(first.key);
    expect(second.storageKey).not.toBe(first.storageKey);
    expect(storage.entries.size).toBe(2);
    expect(storage.getItem(first.storageKey)).not.toBeNull();
    expect(storage.getItem(second.storageKey)).not.toBeNull();
  });

  it("clears only after the API confirms the exact command and effect", async () => {
    const storage = new MemoryStorage();
    const command = await getOrCreatePendingWalletAdjustmentCommand(
      "user-1",
      rewardEffect,
      { storage, createKey: () => "command-key" },
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
    expect(storage.getItem(command.storageKey)).not.toBeNull();

    expect(
      clearConfirmedWalletAdjustmentCommand(
        command,
        {
          _id: "adjustment-1",
          idempotency_key: command.key,
          idempotency_effect_hash: command.effectHash,
        },
        { storage },
      ),
    ).toBe(true);
    expect(storage.getItem(command.storageKey)).toBeNull();
  });

  it("does not clear a command that was conditionally replaced", async () => {
    const storage = new MemoryStorage();
    const command = await getOrCreatePendingWalletAdjustmentCommand(
      "user-1",
      rewardEffect,
      { storage, createKey: () => "command-key" },
    );
    storage.setItem(
      command.storageKey,
      JSON.stringify({
        version: 1,
        scopeHash: command.scopeHash,
        effectHash: command.effectHash,
        key: "newer-command-key",
      }),
    );

    expect(
      clearConfirmedWalletAdjustmentCommand(
        command,
        {
          _id: "adjustment-1",
          idempotency_key: command.key,
          idempotency_effect_hash: command.effectHash,
        },
        { storage },
      ),
    ).toBe(false);
    expect(storage.getItem(command.storageKey)).toContain("newer-command-key");
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
      getOrCreatePendingWalletAdjustmentCommand("user-1", rewardEffect, {
        storage: unavailableStorage,
        createKey: () => "command-key",
      }),
    ).rejects.toBeInstanceOf(WalletAdjustmentCommandStorageError);
  });
});
