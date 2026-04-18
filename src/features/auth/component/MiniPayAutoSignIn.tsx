"use client";

/**
 * Auto-authenticate users who land inside the MiniPay in-app browser.
 *
 * Flow:
 *   1. If `useIsInMiniPay()` is true and the NextAuth session is
 *      `unauthenticated`, trigger the injected wallet (MiniPay provider).
 *   2. Once the wallet is connected and an address is available, build an
 *      EIP-4361 (SIWE) message with a fresh nonce and ask the wallet to sign
 *      it — MiniPay shows no connect prompt because the provider is
 *      pre-authorised inside the in-app browser.
 *   3. Exchange `{ address, message, signature }` for a GoGoCash session via
 *      the new `minipay_siwe` branch in `authFirebase.ts`.
 *
 * Mounts invisibly at the app shell (returns null). A second pass retries on
 * user cancel by resetting the "signed for this address" ref.
 *
 * The backend endpoint `POST /auth/minipay-siwe` is added in a companion commit
 * in the API repo; until that ships this component is a no-op in practice
 * because the SIWE call returns null and `signIn` just fails quietly.
 */

import { useIsInMiniPay } from "@/lib/web3/useIsInMiniPay";
import { fetchSiweNonce } from "@/lib/services/auth";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { createSiweMessage } from "viem/siwe";
import { useAccount, useConnect, useConnectors, useSignMessage } from "wagmi";

/** Celo mainnet chain id — SIWE message binding. Matches `wagmi/chains`' `celo`. */
const CELO_CHAIN_ID = 42220;

export function MiniPayAutoSignIn() {
  const isInMiniPay = useIsInMiniPay();
  const { status } = useSession();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const { signMessageAsync } = useSignMessage();
  const signedForAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!isInMiniPay) return;
    if (status !== "unauthenticated") return;

    // Step 1: auto-connect the injected wallet. The Provider returns quickly
    // once MiniPay has already authorised the site (first-visit is prompted).
    if (!isConnected) {
      const injected = connectors.find((c) => c.type === "injected");
      if (injected) connect({ connector: injected });
      return;
    }

    if (!address) return;
    // Step 2: sign once per address. If the user rejects, we reset and retry
    // on the next effect pass (e.g. they switch accounts).
    if (signedForAddress.current === address) return;
    signedForAddress.current = address;

    // Snapshot the address so an account switch mid-flight (after nonce
    // fetch but before `signIn` lands) can't submit a stale address/sig
    // pair that no longer matches the currently connected wallet.
    const signingAddress = address;
    (async () => {
      try {
        const { nonce } = await fetchSiweNonce();
        if (signingAddress !== signedForAddress.current) return;

        const message = createSiweMessage({
          address: signingAddress,
          chainId: CELO_CHAIN_ID,
          domain: window.location.host,
          nonce,
          statement: "Sign in to GoGoCash with your MiniPay wallet.",
          uri: window.location.origin,
          version: "1",
          issuedAt: new Date(),
        });

        const signature = await signMessageAsync({ message });
        if (signingAddress !== signedForAddress.current) return;

        await signIn("firebase", {
          type: "minipay_siwe",
          address: signingAddress,
          siwe_message: message,
          siwe_signature: signature,
          redirect: false,
        });
      } catch {
        // User cancelled or a network hiccup occurred — allow a retry on the
        // next render pass (only if we're still on the same address).
        if (signingAddress === signedForAddress.current) {
          signedForAddress.current = null;
        }
      }
    })();
  }, [
    isInMiniPay,
    status,
    isConnected,
    address,
    connect,
    connectors,
    signMessageAsync,
  ]);

  return null;
}
