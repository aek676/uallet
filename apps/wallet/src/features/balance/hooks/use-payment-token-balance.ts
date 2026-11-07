import {
  type Address,
  type Base64EncodedDataResponse,
  getBase64Encoder,
} from "@solana/kit";
import { useClient, useTrackedData } from "@solana/react";
import { useEffect, useMemo, useState } from "react";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import {
  decodeTokenAccount,
  getAssociatedTokenAddress,
} from "@repo/payments/token-account";

import { useLoadTimeout } from "#/features/balance/hooks/use-load-timeout";
import type { SolanaClient } from "#/lib/solana-client";

const LOAD_TIMEOUT_MS = 10_000;

/** What `getAccountInfo` and `accountNotifications` return (base64). */
type AccountInfo = Readonly<{
  data: Base64EncodedDataResponse;
  lamports: bigint;
  owner: Address;
}>;

/**
 * Never throws: the Kit store calls the mappers in a subscription callback,
 * where a throw escapes as an uncaught error instead of an `error` status.
 */
type TokenBalance = { amount: bigint } | { invalid: string };

/**
 * On-chain data is untrusted: check the account belongs to the payment
 * token program, mint and owner before reading its amount.
 */
function readTokenBalance(
  account: AccountInfo | null,
  ata: Address,
  owner: Address,
): TokenBalance {
  if (!account || account.lamports === 0n) {
    return { amount: 0n };
  }
  if (account.owner !== PAYMENT_TOKEN.programAddress) {
    return { invalid: `Token account ${ata} is owned by ${account.owner}` };
  }
  try {
    const decoded = decodeTokenAccount(
      getBase64Encoder().encode(account.data[0]),
    );
    if (decoded.mint !== PAYMENT_TOKEN.mint || decoded.owner !== owner) {
      return { invalid: `Token account ${ata} is not ${owner}'s for the mint` };
    }
    return { amount: decoded.amount };
  } catch (error) {
    return { invalid: error instanceof Error ? error.message : String(error) };
  }
}

/** `owner`'s associated token account for the payment token. */
function usePaymentTokenAccount(owner: Address): Address | undefined {
  const [ata, setAta] = useState<{ owner: Address; ata: Address }>();

  useEffect(() => {
    let stale = false;
    void getAssociatedTokenAddress(owner, PAYMENT_TOKEN).then((address) => {
      if (!stale) setAta({ owner, ata: address });
    });
    return () => {
      stale = true;
    };
  }, [owner]);

  // Never return the previous owner's account while deriving the new one.
  return ata?.owner === owner ? ata.ata : undefined;
}

/**
 * Balance of the payment token (`PAYMENT_TOKEN`) for `owner`, kept live:
 * reads the token account and watches it over WebSocket, which also covers
 * the first deposit (the subscription fires when the account is created).
 */
export function usePaymentTokenBalance(owner: Address) {
  const { rpc, rpcSubscriptions } = useClient<SolanaClient>();
  const ata = usePaymentTokenAccount(owner);

  const spec = useMemo(() => {
    if (!ata) return null;
    const config = { commitment: "confirmed", encoding: "base64" } as const;
    return {
      initialValueSource: rpc.getAccountInfo(ata, config),
      initialValueMapper: (account: AccountInfo | null) =>
        readTokenBalance(account, ata, owner),
      streamSource: rpcSubscriptions.accountNotifications(ata, config),
      streamValueMapper: (account: AccountInfo) =>
        readTokenBalance(account, ata, owner),
    };
  }, [rpc, rpcSubscriptions, ata, owner]);

  const { data, error, refresh, status } = useTrackedData(spec);
  const timedOut = useLoadTimeout(status === "loading", LOAD_TIMEOUT_MS);

  const balance = data?.value;
  const invalid = balance && "invalid" in balance ? balance.invalid : undefined;

  return {
    /** `undefined` until the first valid value arrives. */
    amount: balance && "amount" in balance ? balance.amount : undefined,
    // Even with a previous balance: a stale amount must not pass for current.
    error:
      status === "error"
        ? error
        : timedOut
          ? new Error("Timed out loading the token balance")
          : invalid !== undefined
            ? new Error(invalid)
            : undefined,
    refreshing: status === "loading" && !timedOut,
    refresh: () => refresh(),
  };
}
