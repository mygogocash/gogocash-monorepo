// Safe wrappers for Crossmint hooks that prevent store initialization errors
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";

// Safe wrapper for useCrossmintAuth that returns defaults during store initialization
export const useSafeAuth = () => {
  try {
    const auth = useAuth();
    return auth;
  } catch {
    return {
      user: null,
      jwt: null,
      status: "loading" as const,
      logout: async () => {},
      login: () => {},
      getUser: () => {},
    };
  }
};

// Safe wrapper for useWallet that returns defaults during store initialization
export const useSafeWallet = () => {
  try {
    const wallet = useWallet();
    return wallet;
  } catch {
    return {
      wallet: null,
      status: "loading" as const,
      getOrCreateWallet: async () => null,
      createPasskeySigner: async () => null,
    };
  }
};
