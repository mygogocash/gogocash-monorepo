import { describe, expect, it, vi } from "vitest";

import {
  clearPendingWithdrawCommand,
  fingerprintWithdrawEffect,
  readPendingWithdrawCommand,
  resolveWithdrawCommandUserScope,
  withdrawCommandStorageKey,
  writePendingWithdrawCommand,
} from "@mobile/withdraw/withdrawCommandStorage";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn(async (key: string, next: string) => {
      values.set(key, next);
    }),
  };
}

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    globalThis
      .btoa(JSON.stringify(value))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  return `${encode({ alg: "none" })}.${encode(claims)}.signature`;
}

describe("withdraw command storage", () => {
  it("restores the same command after a process-style ref reset", async () => {
    const storage = memoryStorage();
    const userScope = resolveWithdrawCommandUserScope({ _id: "user-1" });
    const command = {
      effectFingerprint: fingerprintWithdrawEffect('{"amount":100}'),
      key: "idem-1",
      userScope,
    };

    await writePendingWithdrawCommand(command, storage);

    await expect(
      readPendingWithdrawCommand(userScope, command.effectFingerprint, storage),
    ).resolves.toEqual(command);
  });

  it("does not expose a command to another signed-in account", async () => {
    const storage = memoryStorage();
    const userScope = resolveWithdrawCommandUserScope({ _id: "user-1" });
    await writePendingWithdrawCommand(
      {
        effectFingerprint: fingerprintWithdrawEffect("effect"),
        key: "idem-1",
        userScope,
      },
      storage,
    );

    await expect(
      readPendingWithdrawCommand(
        resolveWithdrawCommandUserScope({ _id: "user-2" }),
        fingerprintWithdrawEffect("effect"),
        storage,
      ),
    ).resolves.toBeNull();
  });

  it("recovers account A's original key after an A -> B -> A switch", async () => {
    const storage = memoryStorage();
    const accountA = resolveWithdrawCommandUserScope({ _id: "user-a" });
    const accountB = resolveWithdrawCommandUserScope({ _id: "user-b" });
    const commandA = {
      effectFingerprint: fingerprintWithdrawEffect("effect-a"),
      key: "idem-a-original",
      userScope: accountA,
    };
    const commandB = {
      effectFingerprint: fingerprintWithdrawEffect("effect-b"),
      key: "idem-b",
      userScope: accountB,
    };

    await writePendingWithdrawCommand(commandA, storage);
    await writePendingWithdrawCommand(commandB, storage);

    await expect(
      readPendingWithdrawCommand(accountA, commandA.effectFingerprint, storage),
    ).resolves.toEqual(commandA);
    await expect(
      readPendingWithdrawCommand(accountB, commandB.effectFingerprint, storage),
    ).resolves.toEqual(commandB);

    // A stale caller must not replace an uncertain request with a new key.
    await expect(
      writePendingWithdrawCommand(
        { ...commandA, key: "idem-a-replacement" },
        storage,
      ),
    ).resolves.toEqual(commandA);
    await expect(
      readPendingWithdrawCommand(accountA, commandA.effectFingerprint, storage),
    ).resolves.toEqual(commandA);
  });

  it("keeps independent retry keys for multiple effects on one account", async () => {
    const storage = memoryStorage();
    const userScope = resolveWithdrawCommandUserScope({ _id: "user-1" });
    const first = {
      effectFingerprint: fingerprintWithdrawEffect('{"amount":100}'),
      key: "idem-100",
      userScope,
    };
    const second = {
      effectFingerprint: fingerprintWithdrawEffect('{"amount":200}'),
      key: "idem-200",
      userScope,
    };

    await Promise.all([
      writePendingWithdrawCommand(first, storage),
      writePendingWithdrawCommand(second, storage),
    ]);

    await expect(
      readPendingWithdrawCommand(userScope, first.effectFingerprint, storage),
    ).resolves.toEqual(first);
    await expect(
      readPendingWithdrawCommand(userScope, second.effectFingerprint, storage),
    ).resolves.toEqual(second);
  });

  it("clears only the command whose confirmed response owns the key", async () => {
    const storage = memoryStorage();
    const userScope = resolveWithdrawCommandUserScope({ _id: "user-1" });
    const command = {
      effectFingerprint: fingerprintWithdrawEffect("effect"),
      key: "idem-new",
      userScope,
    };
    await writePendingWithdrawCommand(command, storage);

    await clearPendingWithdrawCommand(
      userScope,
      command.effectFingerprint,
      "idem-old",
      storage,
    );
    await expect(
      readPendingWithdrawCommand(userScope, command.effectFingerprint, storage),
    ).resolves.toEqual(command);

    await clearPendingWithdrawCommand(
      userScope,
      command.effectFingerprint,
      "idem-new",
      storage,
    );
    await expect(
      readPendingWithdrawCommand(userScope, command.effectFingerprint, storage),
    ).resolves.toBeNull();
  });

  it("leaves other account and effect commands intact after a conditional clear", async () => {
    const storage = memoryStorage();
    const accountA = resolveWithdrawCommandUserScope({ _id: "user-a" });
    const accountB = resolveWithdrawCommandUserScope({ _id: "user-b" });
    const first = {
      effectFingerprint: fingerprintWithdrawEffect("effect-a-1"),
      key: "idem-a-1",
      userScope: accountA,
    };
    const second = {
      effectFingerprint: fingerprintWithdrawEffect("effect-a-2"),
      key: "idem-a-2",
      userScope: accountA,
    };
    const third = {
      effectFingerprint: fingerprintWithdrawEffect("effect-b-1"),
      key: "idem-b-1",
      userScope: accountB,
    };
    await Promise.all(
      [first, second, third].map((command) =>
        writePendingWithdrawCommand(command, storage),
      ),
    );

    await clearPendingWithdrawCommand(
      accountA,
      first.effectFingerprint,
      first.key,
      storage,
    );

    await expect(
      readPendingWithdrawCommand(accountA, first.effectFingerprint, storage),
    ).resolves.toBeNull();
    await expect(
      readPendingWithdrawCommand(accountA, second.effectFingerprint, storage),
    ).resolves.toEqual(second);
    await expect(
      readPendingWithdrawCommand(accountB, third.effectFingerprint, storage),
    ).resolves.toEqual(third);
  });

  it("migrates the legacy single-slot command without dropping it", async () => {
    const storage = memoryStorage();
    const userScope = resolveWithdrawCommandUserScope({ _id: "user-1" });
    const legacy = {
      effectFingerprint: fingerprintWithdrawEffect("legacy-effect"),
      key: "idem-legacy",
      userScope,
    };
    const next = {
      effectFingerprint: fingerprintWithdrawEffect("next-effect"),
      key: "idem-next",
      userScope,
    };
    await storage.setItem(withdrawCommandStorageKey, JSON.stringify(legacy));

    await expect(
      readPendingWithdrawCommand(userScope, legacy.effectFingerprint, storage),
    ).resolves.toEqual(legacy);
    await writePendingWithdrawCommand(next, storage);

    const persisted = JSON.parse(
      (await storage.getItem(withdrawCommandStorageKey)) ?? "{}",
    ) as { commands?: unknown[]; version?: number };
    expect(persisted.version).toBe(2);
    expect(persisted.commands).toEqual(expect.arrayContaining([legacy, next]));
  });

  it("persists no bank-account PII from the command effect", async () => {
    const storage = memoryStorage();
    const accountEffect = JSON.stringify({
      accountName: "Ada Lovelace",
      accountNumber: "0012345678",
      amount: 100,
    });
    await writePendingWithdrawCommand(
      {
        effectFingerprint: fingerprintWithdrawEffect(accountEffect),
        key: "idem-private",
        userScope: resolveWithdrawCommandUserScope({ _id: "user-1" }),
      },
      storage,
    );

    const persisted = (await storage.getItem(withdrawCommandStorageKey)) ?? "";
    expect(persisted).not.toContain("Ada Lovelace");
    expect(persisted).not.toContain("0012345678");
    expect(persisted).not.toContain("accountNumber");
  });

  it("keeps the same account scope when the backend token rotates", () => {
    const first = resolveWithdrawCommandUserScope({
      _id: "user-1",
      access_token: "old-secret-token",
    });
    const second = resolveWithdrawCommandUserScope({
      _id: "user-1",
      access_token: "new-secret-token",
    });

    expect(second).toBe(first);
    expect(first).not.toContain("user-1");
    expect(first).not.toContain("secret-token");
  });

  it("uses the stable JWT user id for raw-token dev sessions", () => {
    const firstToken = jwt({ exp: 1, userId: "user-1" });
    const secondToken = jwt({ exp: 2, userId: "user-1" });

    expect(resolveWithdrawCommandUserScope({ access_token: secondToken })).toBe(
      resolveWithdrawCommandUserScope({ access_token: firstToken }),
    );
  });

  it("rejects a session without a stable account identity", () => {
    expect(() =>
      resolveWithdrawCommandUserScope({ access_token: "opaque-token" }),
    ).toThrow("A signed-in account is required");
  });
});
