/**
 * Window `ethereum` typing aligned with `ethers` [[BrowserProvider]].
 */
import type { Eip1193Provider } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export type { Eip1193Provider };

/** MetaMask / EIP-1193 often expose numeric `code` (e.g. 4902 = chain not added). */
export function getEip1193ErrorCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
  }
  return undefined;
}
