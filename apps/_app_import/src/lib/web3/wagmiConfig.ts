"use client";

import { createConfig, http } from "wagmi";
import { bsc, celo, polygon, sonic } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/**
 * Wagmi config — four chains we currently support for withdrawals + an injected
 * connector that picks up any EIP-1193 wallet (MetaMask, MiniPay, Brave, Rabby…).
 *
 * MiniPay specifics: MiniPay injects a provider at `window.ethereum` with
 * `isMiniPay: true`. The generic `injected()` connector detects it without any
 * MiniPay-specific code; we branch on that flag via `useIsInMiniPay()` when the
 * UX needs to differ (auto-connect, hide non-Celo chains, etc.).
 *
 * Chain ids come from `wagmi/chains` (mainnet defaults). The app's existing
 * `NEXT_PUBLIC_CHAIN_ID_WITHDRAW_*` env vars still drive the ethers-based
 * withdraw path — when we migrate that path to wagmi we'll reconcile env vs
 * stock-chain ids. For now they co-exist: wagmi is here for MiniPay auth; the
 * on-chain withdraw flow is unchanged.
 */
export const wagmiConfig = createConfig({
  chains: [celo, polygon, bsc, sonic],
  connectors: [injected()],
  transports: {
    [celo.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [sonic.id]: http(),
  },
  // Server components render the tree; wagmi needs to know to defer connector
  // instantiation until the client mounts.
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
