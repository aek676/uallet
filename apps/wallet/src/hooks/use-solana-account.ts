import { type Address, isAddress, type TransactionSigner } from "@solana/kit";
import { createTransactionSignerFromWalletAccount } from "@solana/wallet-account-signer";
import {
  StandardConnect,
  type StandardConnectFeature,
  StandardEvents,
  type StandardEventsFeature,
} from "@wallet-standard/features";
import { getOrCreateUiWalletAccountForStandardWalletAccount } from "@wallet-standard/ui-registry";
import type { Connection } from "@web3auth/no-modal";
import { useWeb3Auth } from "@web3auth/no-modal/react";
import { useEffect, useState } from "react";

import { SOLANA_CHAIN } from "#/lib/web3auth";

/**
 * How long to wait for the Solana account once Web3Auth is connected.
 * Normally it takes a couple of seconds.
 */
const CONNECT_TIMEOUT_MS = 15_000;

type SolanaWallet = NonNullable<Connection["solanaWallet"]>;

export type SolanaAccountState =
  | { status: "connecting" }
  | { status: "connected"; address: Address; signer: TransactionSigner }
  | { status: "error"; error: unknown };

function hasConnect(
  wallet: SolanaWallet,
): wallet is SolanaWallet & { features: StandardConnectFeature } {
  return StandardConnect in wallet.features;
}

function hasEvents(
  wallet: SolanaWallet,
): wallet is SolanaWallet & { features: StandardEventsFeature } {
  return StandardEvents in wallet.features;
}

function firstAddress(accounts: SolanaWallet["accounts"]): Address | undefined {
  const address = accounts[0]?.address;
  return address !== undefined && isAddress(address) ? address : undefined;
}

/**
 * Sign only, not sign-and-send: Web3Auth would send through its own RPC. We
 * send through ours, which also lets another account pay the fee later.
 */
function createWalletSigner(
  wallet: SolanaWallet,
  account: SolanaWallet["accounts"][number],
): TransactionSigner {
  return createTransactionSignerFromWalletAccount(
    getOrCreateUiWalletAccountForStandardWalletAccount(wallet, account),
    SOLANA_CHAIN,
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`Timed out after ${ms} ms`)),
      ms,
    );
  });
  return Promise.race([promise, timer]).finally(() => clearTimeout(timeout));
}

/**
 * Solana account of the Web3Auth session, read from its Wallet Standard
 * wallet (`connection.solanaWallet`).
 *
 * The wallet loads its accounts lazily: `standard:connect` (silent, the user
 * is already logged in) loads them, and `standard:events` reports changes.
 * Loading can fail or hang (RPC down, DNS error...), hence the timeout:
 * otherwise the screen would show skeletons forever.
 *
 * Call it once (in `src/app`) and pass the address down.
 */
export function useSolanaAccount(): SolanaAccountState {
  const { connection } = useWeb3Auth();
  const wallet = connection?.solanaWallet ?? null;

  const [result, setResult] = useState<{
    wallet: SolanaWallet | null;
    state: SolanaAccountState;
  }>();

  useEffect(() => {
    const setState = (state: SolanaAccountState) =>
      setResult({ wallet, state });

    if (!wallet) {
      const timeout = setTimeout(() => {
        setState({ status: "error", error: new Error("No Solana wallet") });
      }, CONNECT_TIMEOUT_MS);
      return () => clearTimeout(timeout);
    }

    let stale = false;

    function update(accounts: SolanaWallet["accounts"]) {
      if (stale) return;
      const address = firstAddress(accounts);
      const account = accounts[0];
      if (!address || !account || !wallet) {
        setState({ status: "error", error: new Error("No Solana account") });
        return;
      }
      try {
        setState({
          status: "connected",
          address,
          signer: createWalletSigner(wallet, account),
        });
      } catch (error) {
        setState({ status: "error", error });
      }
    }

    const unsubscribe = hasEvents(wallet)
      ? wallet.features[StandardEvents].on("change", ({ accounts }) => {
          if (accounts) update(accounts);
        })
      : undefined;

    if (firstAddress(wallet.accounts)) {
      update(wallet.accounts);
    } else if (hasConnect(wallet)) {
      withTimeout(
        wallet.features[StandardConnect].connect({ silent: true }),
        CONNECT_TIMEOUT_MS,
      ).then(
        ({ accounts }) => update(accounts),
        (error: unknown) => {
          if (!stale) setState({ status: "error", error });
        },
      );
    } else {
      setState({
        status: "error",
        error: new Error("The Solana wallet can't connect"),
      });
    }

    return () => {
      stale = true;
      unsubscribe?.();
    };
  }, [wallet]);

  return result?.wallet === wallet ? result.state : { status: "connecting" };
}
