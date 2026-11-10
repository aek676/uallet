import { type Address, isAddress } from "@solana/kit";
import {
  StandardConnect,
  type StandardConnectFeature,
  StandardEvents,
  type StandardEventsFeature,
} from "@wallet-standard/features";
import type { Connection } from "@web3auth/no-modal";
import { useWeb3Auth } from "@web3auth/no-modal/react";
import { useEffect, useState } from "react";

/**
 * How long to wait for the Solana account once Web3Auth is connected.
 * Normally it takes a couple of seconds.
 */
const CONNECT_TIMEOUT_MS = 15_000;

type SolanaWallet = NonNullable<Connection["solanaWallet"]>;

export type SolanaAccountState =
  | { status: "connecting" }
  | { status: "connected"; address: Address }
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
      setState(
        address
          ? { status: "connected", address }
          : { status: "error", error: new Error("No Solana account") },
      );
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
