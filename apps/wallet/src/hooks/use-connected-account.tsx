import type { Address, TransactionSigner } from "@solana/kit";
import { createContext, type ReactNode, use, useMemo } from "react";

type ConnectedAccount = { address: Address; signer: TransactionSigner };

const ConnectedAccountContext = createContext<ConnectedAccount | null>(null);

/** The Solana account of the session, for the routes behind the login. */
export function ConnectedAccountProvider({
  address,
  signer,
  children,
}: ConnectedAccount & { children: ReactNode }) {
  const account = useMemo(() => ({ address, signer }), [address, signer]);
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
