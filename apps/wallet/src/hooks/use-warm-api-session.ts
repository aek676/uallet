import type { Address } from "@solana/kit";
import { useWeb3Auth } from "@web3auth/no-modal/react";
import { useEffect } from "react";

import { getApiSession } from "#/lib/api-session";

export function useWarmApiSession(address: Address | undefined) {
  const { web3Auth } = useWeb3Auth();

  useEffect(() => {
    if (!web3Auth || !address) return;
    getApiSession({ web3Auth, address }).catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.warn("Couldn't open the API session", error);
      }
    });
  }, [web3Auth, address]);
}
