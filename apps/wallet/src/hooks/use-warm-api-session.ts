import type { Address } from "@solana/kit";
import { useEffect } from "react";

import { getApiSession, type IdTokenSource } from "#/lib/api-session";

export function useWarmApiSession(
  web3Auth: IdTokenSource,
  address: Address | undefined,
) {
  useEffect(() => {
    if (!address) return;
    getApiSession({ web3Auth, address }).catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.warn("Couldn't open the API session", error);
      }
    });
  }, [web3Auth, address]);
}
