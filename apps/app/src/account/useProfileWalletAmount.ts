import { useMemo } from "react";

import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import {
  PROFILE_WALLET_AMOUNT_PLACEHOLDER,
  resolveProfileWalletAmount,
} from "@mobile/account/resolveProfileWalletAmount";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { getMobileEnv } from "@mobile/config/env";

const WALLET_FIXTURE_DATA = {
  netAmount: 0,
  netAmountTHB: 0,
  totalPayoutTHB: 0,
  totalPayoutUSD: 0,
};

export function useProfileWalletAmount(): { amount: string; isLoading: boolean } {
  const env = useMemo(() => getMobileEnv(), []);
  const session = useMobileSessionSnapshot();
  const useBackend = env.accountDataSource === "backend";
  const walletResource = useCustomerAccountResource({
    enabled: useBackend,
    fixtureData: WALLET_FIXTURE_DATA,
    resourceId: "wallet",
  });

  const walletLoading =
    useBackend &&
    (walletResource.status === "loading" || walletResource.status === "offline");

  const sessionWallet = typeof session?.wallet === "string" ? session.wallet : undefined;

  const amount = resolveProfileWalletAmount(
    env.accountDataSource,
    sessionWallet,
    walletResource.data,
    walletLoading,
  );

  return {
    amount,
    isLoading: walletLoading && amount === PROFILE_WALLET_AMOUNT_PLACEHOLDER,
  };
}
