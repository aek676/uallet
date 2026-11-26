import type { Address, TransactionSigner } from "@solana/kit";
import { createContext, type ReactNode, use, useMemo } from "react";

import type { ApiClient } from "#/lib/api-client";
import { apiClient, type IdTokenSource } from "#/lib/api-session";

type ConnectedAccount = {
  address: Address;
  signer: TransactionSigner;
  api: ApiClient;
};

const ConnectedAccountContext = createContext<ConnectedAccount | null>(null);

type ConnectedAccountProviderProps = {
  address: Address;
  signer: TransactionSigner;
  /** The Web3Auth instance, whose identity token opens the API session. */
  web3Auth: IdTokenSource;
  children: ReactNode;
};

/** The Solana account of the session, for the routes behind the login. */
export function ConnectedAccountProvider({
  address,
  signer,
  web3Auth,
  children,
}: ConnectedAccountProviderProps) {
  const account = useMemo(
    () => ({ address, signer, api: apiClient({ web3Auth, address }) }),
    [address, signer, web3Auth],
  );
  return (
    <ConnectedAccountContext value={account}>
      {children}
    </ConnectedAccountContext>
  );
}

/** Only inside `_authenticated` routes, which render once it's connected. */
export function useConnectedAccount(): ConnectedAccount {
  const account = use(ConnectedAccountContext);
  if (!account) {
    throw new Error("useConnectedAccount must be used inside the login gate");
  }
  return account;
}
