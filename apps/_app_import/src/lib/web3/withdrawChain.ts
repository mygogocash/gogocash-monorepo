import { env } from "@/env";

/**
 * Maps the selected withdraw chain tab to the configured env chain id (Polygon / BNB / Sonic / Celo).
 */
export function resolveEnvWithdrawChainId(chainIdSelect: number): number {
  const polygon = Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_POLYGON);
  const bnb = Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB);
  const sonic = Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC);
  const celo = Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_CELO);

  if (chainIdSelect === polygon) {
    return polygon;
  }
  if (chainIdSelect === bnb) {
    return bnb;
  }
  if (chainIdSelect === sonic) {
    return sonic;
  }
  return celo;
}

/** `wallet_switchEthereumChain` param shape. */
export function withdrawChainIdHex(chainIdSelect: number): string {
  const id = resolveEnvWithdrawChainId(chainIdSelect);
  return `0x${id.toString(16)}`;
}
